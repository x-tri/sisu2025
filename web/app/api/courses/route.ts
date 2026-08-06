import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { buildCourseReference } from '@/lib/course-reference'
import { resolveUniversityAcronym } from '@/lib/institution-acronyms'
import type {
  CourseSearchItem,
  CourseSearchResponse,
  PaginationMetadata,
} from '@/types/course'
import type { CourseWeights, CutScore } from '@/lib/supabase'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const BROAD_MODALITY_ID = 41

function summarizeWeights(weights: CourseWeights | null): string | null {
  if (!weights) return null
  const areas = [
    ['redação', weights.peso_red],
    ['linguagens', weights.peso_ling],
    ['matemática', weights.peso_mat],
    ['ciências humanas', weights.peso_ch],
    ['ciências da natureza', weights.peso_cn],
  ] as const
  const valid: Array<readonly [string, number]> = []
  for (const [label, value] of areas) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      valid.push([label, value])
    }
  }
  if (valid.length !== areas.length) return null

  const unique = new Set(valid.map(([, value]) => value))
  if (unique.size === 1) return 'Este curso não diferencia as matérias por peso'

  const highest = Math.max(...valid.map(([, value]) => value))
  const highlighted = valid.filter(([, value]) => value === highest).map(([label]) => label)
  return highlighted.length === 1
    ? `Maior peso para ${highlighted[0]}`
    : `Maiores pesos para ${highlighted.slice(0, -1).join(', ')} e ${highlighted.at(-1)}`
}

async function enrichSearchItems(courses: CourseSearchItem[]): Promise<CourseSearchItem[]> {
  const courseIds = courses.map(course => course.id)
  const [scoresResult, weightsResult] = await Promise.all([
    supabase.getCoursePreviewCutScores(courseIds, BROAD_MODALITY_ID),
    supabase.getCoursePreviewWeights(courseIds),
  ])

  const scoresByCourse = new Map<number, CutScore>()
  for (const score of scoresResult.data || []) {
    if (!scoresByCourse.has(score.course_id)) scoresByCourse.set(score.course_id, score)
  }

  const weightsByIdentity = new Map<string, CourseWeights>()
  for (const weights of weightsResult.data || []) {
    const identity = `${weights.course_id}:${weights.year}`
    if (!weightsByIdentity.has(identity)) weightsByIdentity.set(identity, weights)
  }

  return courses.map(course => {
    const score = scoresByCourse.get(course.id) || null
    const weights = score
      ? weightsByIdentity.get(`${course.id}:${score.year}`) || null
      : null
    const reference = score ? buildCourseReference(course.code, score, weights) : null

    return {
      id: course.id,
      code: course.code,
      name: course.name,
      university: course.university,
      campus: course.campus,
      city: course.city,
      state: course.state,
      degree: course.degree,
      schedule: course.schedule,
      universityAcronym: resolveUniversityAcronym(course.university),
      weightSummary: summarizeWeights(weights),
      reference,
    }
  })
}

function getIntegerParam(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER
): number {
  if (value === null) {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, minimum), maximum)
}

function getPagination(
  total: number,
  returned: number,
  limit: number,
  offset: number
): PaginationMetadata {
  const page = Math.floor(offset / limit) + 1

  return {
    page,
    limit,
    offset,
    returned,
    total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: offset + returned < total,
  }
}

/**
 * GET /api/courses
 * Search courses by query or list all
 *
 * Query params:
 *   - q: search query (name, university, city)
 *   - course: course name filter
 *   - institution: institution name filter
 *   - city: city name filter
 *   - state: exact state abbreviation filter
 *   - page: one-based page (takes precedence over offset)
 *   - limit: max results (default 20, maximum 100)
 *   - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const rawQuery = searchParams.get('q')?.trim() || ''
  const query = rawQuery.length >= 2 ? rawQuery : ''
  const course = searchParams.get('course')?.trim() || ''
  const institution = searchParams.get('institution')?.trim() || ''
  const city = searchParams.get('city')?.trim() || ''
  const state = searchParams.get('state')?.trim() || ''
  const limit = getIntegerParam(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT)
  const requestedPage = getIntegerParam(searchParams.get('page'), 1, 1)
  const offset = searchParams.has('page')
    ? (requestedPage - 1) * limit
    : getIntegerParam(searchParams.get('offset'), 0, 0)

  try {
    const id = searchParams.get('id')
    const code = searchParams.get('code')

    if (id) {
      const parsedId = Number(id)
      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return NextResponse.json({ error: 'Invalid course id' }, { status: 400 })
      }

      // Get full course details by ID
      const result = await supabase.getFullCourseDataById(parsedId)

      if (result.error) {
        return NextResponse.json(
          { error: 'Não foi possível carregar os dados da oferta.' },
          { status: 502 }
        )
      }

      if (!result.data) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(result.data)
    }

    if (code) {
      const parsedCode = Number(code)
      if (!Number.isInteger(parsedCode) || parsedCode <= 0) {
        return NextResponse.json({ error: 'Invalid course code' }, { status: 400 })
      }

      // Get full course details (weights, cut scores)
      const result = await supabase.getFullCourseData(parsedCode)

      if (result.error) {
        return NextResponse.json(
          { error: 'Não foi possível carregar os dados da oferta.' },
          { status: 502 }
        )
      }

      if (!result.data) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(result.data)
    }

    const hasSearchFilters = Boolean(query || course || institution || city || state)
    if (hasSearchFilters) {
      const searchFilters = {
        query: query || undefined,
        course: course || undefined,
        institution: institution || undefined,
        city: city || undefined,
        state: state || undefined,
      }
      const result = query
        ? await supabase.searchCoursesRankedPaginated(searchFilters, limit, offset)
        : await supabase.searchCoursesPaginated(searchFilters, limit, offset)

      if (result.error) {
        return NextResponse.json(
          { error: 'Não foi possível buscar as ofertas.' },
          { status: 502 }
        )
      }

      const courses = await enrichSearchItems(result.data || [])
      const total = result.count ?? courses.length
      const response: CourseSearchResponse = {
        courses,
        query: query || null,
        count: total,
        total,
        limit,
        offset,
        pagination: getPagination(total, courses.length, limit, offset),
      }

      return NextResponse.json(response)
    } else {
      // List mode
      const result = await supabase.getCourses(limit, offset)

      if (result.error) {
        return NextResponse.json(
          { error: 'Não foi possível listar as ofertas.' },
          { status: 502 }
        )
      }

      const courses = await enrichSearchItems((result.data || []) as CourseSearchItem[])
      const total = result.count ?? courses.length
      const response: CourseSearchResponse = {
        courses,
        query: null,
        count: total,
        total,
        limit,
        offset,
        pagination: getPagination(total, courses.length, limit, offset),
      }

      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Course API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
