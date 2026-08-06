import { NextRequest, NextResponse } from 'next/server'

import {
  buildCourseStatistics,
  resolveStatisticsModality,
  type ApprovedScoreRow,
} from '@/lib/course-statistics'
import { supabase } from '@/lib/supabase'

const STUDENT_BATCH_SIZE = 1000
const MAX_STUDENT_ROWS = 20_000

interface RouteParams {
  params: Promise<{ code: string }> | { code: string }
}

function jsonResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

async function loadApprovedScoreRows(courseId: number): Promise<{
  data: ApprovedScoreRow[] | null
  error: string | null
}> {
  const rows: ApprovedScoreRow[] = []

  for (let offset = 0; offset < MAX_STUDENT_ROWS; offset += STUDENT_BATCH_SIZE) {
    const params = new URLSearchParams({
      course_id: `eq.${courseId}`,
      select: 'year,modality_code,score,call_number',
      order: 'year.asc,call_number.asc,modality_code.asc,score.asc',
      limit: String(STUDENT_BATCH_SIZE),
      offset: String(offset),
    })
    const result = await supabase.request<ApprovedScoreRow[]>(
      `approved_students?${params.toString()}`,
    )
    if (result.error || !result.data) {
      return { data: null, error: result.error || 'Incomplete approved score response' }
    }

    rows.push(...result.data)
    if (result.data.length < STUDENT_BATCH_SIZE) return { data: rows, error: null }
  }

  return { data: null, error: 'Approved score response exceeded the safe row limit' }
}

/**
 * GET /api/courses/[code]/statistics?modalityId=...
 *
 * Returns only aggregated/statistical records. Student names and other nominal
 * fields are neither selected from Supabase nor serialized in the response.
 */
export async function GET(
  request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  const { code: rawCode } = await context.params
  if (!/^\d+$/.test(rawCode)) {
    return jsonResponse({ error: 'INVALID_COURSE_CODE' }, 400)
  }

  const courseCode = Number(rawCode)
  if (!Number.isSafeInteger(courseCode) || courseCode <= 0) {
    return jsonResponse({ error: 'INVALID_COURSE_CODE' }, 400)
  }

  const modalityId = request.nextUrl.searchParams.get('modalityId')?.trim() || ''
  if (!/^\d+$/.test(modalityId)) {
    return jsonResponse({ error: 'INVALID_MODALITY_ID' }, 400)
  }

  try {
    const courseResult = await supabase.getCourseByCode(courseCode)
    if (courseResult.error) {
      console.error('Statistics course lookup failed:', courseResult.error)
      return jsonResponse({ error: 'COURSE_LOOKUP_FAILED' }, 502)
    }
    if (!courseResult.data) {
      return jsonResponse({ error: 'COURSE_NOT_FOUND' }, 404)
    }

    const scoreResult = await supabase.getLatestCutScores(courseResult.data.id)
    if (scoreResult.error || !scoreResult.data) {
      console.error('Statistics cutoff lookup failed:', scoreResult.error)
      return jsonResponse({ error: 'STATISTICS_LOOKUP_FAILED' }, 502)
    }

    // Resolve the exact id before loading the aggregate student dataset. This
    // is also the no-fallback guard for a modality that does not exist.
    if (!resolveStatisticsModality(scoreResult.data, modalityId)) {
      return jsonResponse({
        error: 'NO_REFERENCE_FOR_MODALITY',
        code: 'NO_REFERENCE_FOR_MODALITY',
        modalityId,
      }, 404)
    }

    const studentResult = await loadApprovedScoreRows(courseResult.data.id)
    if (studentResult.error || !studentResult.data) {
      console.error('Statistics approved score lookup failed:', studentResult.error)
      return jsonResponse({ error: 'STATISTICS_LOOKUP_FAILED' }, 502)
    }

    const statistics = buildCourseStatistics(
      courseCode,
      modalityId,
      scoreResult.data,
      studentResult.data,
    )
    if (!statistics) {
      return jsonResponse({
        error: 'NO_REFERENCE_FOR_MODALITY',
        code: 'NO_REFERENCE_FOR_MODALITY',
        modalityId,
      }, 404)
    }

    return jsonResponse(statistics)
  } catch (error) {
    console.error('Course statistics API error:', error)
    return jsonResponse({ error: 'INTERNAL_SERVER_ERROR' }, 500)
  }
}
