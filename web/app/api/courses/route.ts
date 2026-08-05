import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type {
  CourseSearchResponse,
  PaginationMetadata,
} from '@/types/course'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

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
      const result = await supabase.searchCoursesPaginated({
        query: query || undefined,
        course: course || undefined,
        institution: institution || undefined,
        city: city || undefined,
        state: state || undefined,
      }, limit, offset)

      if (result.error) {
        return NextResponse.json(
          { error: 'Não foi possível buscar as ofertas.' },
          { status: 502 }
        )
      }

      const courses = result.data || []
      const total = result.count ?? courses.length
      const response: CourseSearchResponse = {
        courses: result.data || [],
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

      const courses = result.data || []
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
