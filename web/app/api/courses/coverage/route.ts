import { NextResponse } from 'next/server'
import { getReferenceVerification } from '@/lib/course-reference'
import { supabase } from '@/lib/supabase'
import { createTtlCache } from '@/lib/ttl-cache'
import type { CourseCoverageResponse } from '@/types/course'

export const dynamic = 'force-dynamic'

const SUPABASE_HOME_URL = 'https://supabase.com'
const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
]

const COVERAGE_KEY = 'coverage'
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600'

type CoverageResult = { status: number; body: CourseCoverageResponse | { error: string } }

// A medição pagina a tabela courses inteira e conta duas tabelas (~5 s a frio);
// só resultados 200 são reaproveitados.
const coverageCache = createTtlCache<string, CoverageResult>({
  ttlMs: 5 * 60_000,
  maxEntries: 1,
  shouldKeep: result => result.status === 200,
})

function normalizeDimension(value: string | null): string | null {
  const normalized = value?.trim().toLocaleLowerCase('pt-BR')
  return normalized || null
}

/**
 * GET /api/courses/coverage
 *
 * Returns measured database coverage. Every row total comes from an exact
 * Content-Range count; geography dimensions are derived from all course rows.
 */
async function measureCoverage(): Promise<CoverageResult> {
  const [courseRows, weightRows, cutScoreRows, latestCutScore] = await Promise.all([
    supabase.getCourseCoverageRows(),
    supabase.countCoverageRows('course_weights'),
    supabase.countCoverageRows('cut_scores'),
    supabase.getLatestCutScoreMetadata(),
  ])

  const error = courseRows.error
    || weightRows.error
    || cutScoreRows.error
    || latestCutScore.error

  if (error) {
    console.error('Course coverage query failed:', error)
    return { status: 502, body: { error: 'Unable to measure course coverage' } }
  }

  if (
    !courseRows.data
    || courseRows.count === undefined
    || weightRows.count === undefined
    || cutScoreRows.count === undefined
  ) {
    return { status: 502, body: { error: 'Incomplete course coverage metadata' } }
  }

  const states = new Set<string>()
  const cities = new Set<string>()
  const institutions = new Set<string>()

  for (const course of courseRows.data) {
    const state = normalizeDimension(course.state)
    const city = normalizeDimension(course.city)
    const institution = normalizeDimension(course.university)

    if (state) {
      states.add(state.toUpperCase())
    }
    if (city) {
      cities.add(`${state || 'unknown'}:${city}`)
    }
    if (institution) {
      institutions.add(institution)
    }
  }

  const latest = latestCutScore.data?.[0] || null
  const latestCapturedAt = latest?.captured_at || null
  const generatedAt = new Date()
  const presentStates = Array.from(states).sort()
  const missingStates = BRAZIL_STATES.filter(state => !states.has(state))
  const response: CourseCoverageResponse = {
    generatedAt: generatedAt.toISOString(),
    capturedAt: latestCapturedAt,
    verification: getReferenceVerification(latestCapturedAt, null, generatedAt),
    sourceUrl: supabase.getDataApiUrl(),
    intermediary: {
      name: 'Supabase',
      url: SUPABASE_HOME_URL,
    },
    coverage: {
      courses: {
        rows: courseRows.count,
        states: states.size,
        cities: cities.size,
        institutions: institutions.size,
        presentStates,
        missingStates,
      },
      weights: {
        rows: weightRows.count,
      },
      cutScores: {
        rows: cutScoreRows.count,
        latestEdition: latest?.year || null,
        latestCapturedAt,
      },
    },
  }

  return { status: 200, body: response }
}

/**
 * GET /api/courses/coverage
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { status, body } = await coverageCache.get(COVERAGE_KEY, measureCoverage)
    return NextResponse.json(body, {
      status,
      headers: { 'Cache-Control': status === 200 ? CACHE_CONTROL : 'no-store' },
    })
  } catch (error) {
    console.error('Course coverage API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
