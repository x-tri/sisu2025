import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const state = searchParams.get('state')
    const city = searchParams.get('city')
    const university = searchParams.get('university')

    try {
        if (!['states', 'cities', 'universities', 'courses'].includes(type || '')) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
        }
        if (type === 'cities' && !state) return NextResponse.json([], { status: 400 })
        if (type === 'universities' && (!state || !city)) {
            return NextResponse.json([], { status: 400 })
        }
        if (type === 'courses' && (!state || !city || !university)) {
            return NextResponse.json([], { status: 400 })
        }

        const catalogResult = await supabase.getCourseCatalog()
        if (catalogResult.error || !catalogResult.data) throw new Error(catalogResult.error || 'Catalog unavailable')
        const courses = catalogResult.data

        if (type === 'states') {
            const states = Array.from(new Set(courses.map(course => course.state).filter(Boolean))).sort()
            return NextResponse.json(states)
        }

        if (type === 'cities') {
            const cities = Array.from(new Set(
                courses
                    .filter(course => course.state === state)
                    .map(course => course.city)
                    .filter((city): city is string => Boolean(city))
            )).sort((left, right) => left.localeCompare(right, 'pt-BR'))
            return NextResponse.json(cities)
        }

        if (type === 'universities') {
            const universities = Array.from(new Set(
                courses
                    .filter(course => course.state === state && course.city === city)
                    .map(course => course.university)
                    .filter((institution): institution is string => Boolean(institution))
            )).sort((left, right) => left.localeCompare(right, 'pt-BR'))
            return NextResponse.json(universities)
        }

        if (type === 'courses') {
            const matchingCourses = courses
                .filter(course => (
                    course.state === state
                    && course.city === city
                    && course.university === university
                ))
                .map(({ id, code, name, degree, campus, schedule }) => ({
                    id,
                    code,
                    name,
                    degree,
                    campus,
                    schedule,
                }))
                .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))

            return NextResponse.json(matchingCourses)
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

    } catch (error) {
        console.error('Filter API Error:', error)
        return NextResponse.json(
            { error: 'Não foi possível carregar os filtros neste momento.' },
            { status: 502 }
        )
    }
}
