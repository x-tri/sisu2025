
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sisymqzxvuktdcbsbpbp.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function inspect() {
    console.log('Inspecting Jornalismo courses...')

    const { data: courses, error } = await supabase
        .from('courses')
        .select(`
            id,
            name,
            university,
            cut_scores (
                year,
                modality_name,
                cut_score
            )
        `)
        .ilike('name', '%Jornalismo%')
        .limit(3)

    if (error) {
        console.error(error)
        return
    }

    courses.forEach(c => {
        console.log(`\nCourse: ${c.name} (${c.university})`)
        console.log('Cut Scores:', c.cut_scores?.length)
        if (c.cut_scores?.length > 0) {
            // console.log(JSON.stringify(c.cut_scores, null, 2))
            // Just show unique modality names
            const modNames = Array.from(new Set(c.cut_scores.map(cs => cs.modality_name)))
            console.log('Modalities found:', modNames)
        }
    })
}

inspect()
