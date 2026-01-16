import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/courses
 * Search courses by query or list all
 *
 * Query params:
 *   - q: search query (name, university, city)
 *   - limit: max results (default 20)
 *   - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    if (query && query.length >= 2) {
      // Search mode
      const result = await supabase.searchCourses(query, limit)

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        courses: result.data || [],
        query,
        count: result.data?.length || 0,
      })
    } else {
      // List mode
      const result = await supabase.getCourses(limit, offset)

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        courses: result.data || [],
        count: result.count,
        limit,
        offset,
      })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
