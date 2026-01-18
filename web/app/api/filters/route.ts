import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const state = searchParams.get('state')
    const city = searchParams.get('city')
    const university = searchParams.get('university')

    try {
        if (type === 'states') {
            // Get all DISTINCT states - need to paginate to get all 8000+ courses
            let allStates = new Set<string>();
            let offset = 0;
            const limit = 1000;

            while (true) {
                const { data, error } = await supabase.request<any[]>(`courses?select=state&state=not.is.null&limit=${limit}&offset=${offset}`)
                if (error) throw error

                if (!data || data.length === 0) break;

                data.forEach((c: any) => {
                    if (c.state) allStates.add(c.state);
                });

                if (data.length < limit) break;
                offset += limit;
            }

            const states = Array.from(allStates).sort()
            return NextResponse.json(states)
        }

        if (type === 'cities') {
            if (!state) return NextResponse.json([], { status: 400 })

            const { data, error } = await supabase.request<any[]>(`courses?select=city&state=eq.${state}`)
            if (error) throw error

            const cities = Array.from(new Set(data?.map((c: any) => c.city).filter(Boolean))).sort()
            return NextResponse.json(cities)
        }

        if (type === 'universities') {
            if (!state || !city) return NextResponse.json([], { status: 400 })

            // Note: 'university' field might be null, but we need university name.
            // Also checking headers. 
            // We use query params in URL for filtering
            const params = new URLSearchParams()
            params.append('state', `eq.${state}`)
            params.append('city', `eq.${city}`)

            const { data, error } = await supabase.request<any[]>(`courses?select=university&${params.toString()}`)
            if (error) throw error

            const universities = Array.from(new Set(data?.map((c: any) => c.university).filter(Boolean))).sort()
            return NextResponse.json(universities)
        }

        if (type === 'courses') {
            if (!state || !city || !university) return NextResponse.json([], { status: 400 })

            const params = new URLSearchParams()
            params.append('state', `eq.${state}`)
            params.append('city', `eq.${city}`)
            params.append('university', `eq.${university}`)

            // Return id, code, name, degree
            const { data, error } = await supabase.request<any[]>(`courses?select=id,code,name,degree,campus,schedule&${params.toString()}`)
            if (error) throw error

            // Return full objects, sorted by name
            return NextResponse.json(data?.sort((a: any, b: any) => a.name.localeCompare(b.name)))
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

    } catch (error) {
        console.error('Filter API Error:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
