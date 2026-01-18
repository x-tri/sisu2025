import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    const code = parseInt(params.code)
    if (isNaN(code)) {
        return NextResponse.json({ error: 'Invalid course code' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    try {
        // First resolve the course ID from the code
        const courseResult = await supabase.getCourseByCode(code)

        if (courseResult.error || !courseResult.data) {
            return NextResponse.json(
                { error: 'Course not found' },
                { status: 404 }
            )
        }

        const courseId = courseResult.data.id

        // Then fetch students
        const result = await supabase.getApprovedStudents(courseId, page, limit)

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            )
        }

        // Add hasMore flag
        const hasMore = (result.data?.length || 0) === limit

        // Get the actual year from the data
        const actualYear = result.data?.[0]?.year || null

        return NextResponse.json({
            students: result.data || [],
            count: result.count,
            page,
            limit,
            hasMore,
            year: actualYear  // Return the actual year of the data
        })

    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
