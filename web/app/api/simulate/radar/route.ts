import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';;
import { getModalityCode } from '@/utils/modality';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { grades, courseName, modalityCode } = body;

        console.log('Radar Simulation Request:', { courseName, modalityCode });

        if (!grades || !courseName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Search for courses matching the name (loose match)
        // Construction the PostgREST query
        // We select fields needed for display and calculation
        const selectParams = [
            'id', 'code', 'name', 'university', 'campus', 'city', 'state', 'degree', 'schedule',
            'course_weights(peso_red,peso_ling,peso_mat,peso_ch,peso_cn,year)',
            'cut_scores(year,modality_name,cut_score,vacancies)'
        ].join(',');

        const query = new URLSearchParams({
            select: selectParams,
            name: `ilike.%${courseName}%`,
            limit: '500'
        });

        const { data: courses, error: courseError } = await supabase.request<any[]>(`courses?${query.toString()}`);

        if (courseError) {
            console.error('Supabase Error:', courseError);
            throw courseError;
        }

        console.log(`[Radar] Found ${courses?.length} potential courses for "${courseName}"`);

        if (!courses || courses.length === 0) {
            return NextResponse.json([]);
        }

        // Limit debug info
        const debugInfo: any[] = [];

        // 2. Process each course to calculate user score and find cut score
        const results = courses.map((course: any) => {
            // A. Get best weights (latest)
            // Weights is an array, we want the latest year
            const weightsList = course.course_weights || course.weights; // Fallback just in case
            const latestWeights = weightsList?.sort((a: any, b: any) => b.year - a.year)[0];

            // Check if we have valid weights (either flat or object if legacy)
            const hasWeights = latestWeights && (
                latestWeights.pesos ||
                (latestWeights.peso_red !== undefined && latestWeights.peso_red !== null)
            );

            if (!hasWeights) {
                if (debugInfo.length < 10) debugInfo.push({ name: course.name, reason: 'No weights' });
                return null; // Cannot calculate without weights
            }

            // Normalize weights to the object structure expected by calculation
            const w = latestWeights.pesos || {
                redacao: latestWeights.peso_red,
                linguagens: latestWeights.peso_ling,
                matematica: latestWeights.peso_mat,
                humanas: latestWeights.peso_ch,
                natureza: latestWeights.peso_cn
            };
            // Default to 1 if weight is missing (unlikely if record exists)
            const userScore = (
                (grades.redacao * (w.redacao || 1)) +
                (grades.linguagens * (w.linguagens || 1)) +
                (grades.humanas * (w.humanas || 1)) +
                (grades.natureza * (w.natureza || 1)) +
                (grades.matematica * (w.matematica || 1))
            ) / ((w.redacao || 1) + (w.linguagens || 1) + (w.humanas || 1) + (w.natureza || 1) + (w.matematica || 1));


            // B. Find matching cut score for selected modality
            // B. Find matching cut score for selected modality
            if (!course.cut_scores || course.cut_scores.length === 0) {
                if (debugInfo.length < 10) debugInfo.push({ name: course.name, reason: 'No cut_scores array' });
                return null;
            }

            // Define helper to get effective score from a record
            const getEffectiveScore = (cs: any) => {
                // If we have a direct cut_score, use it
                if (cs.cut_score && cs.cut_score > 0) return cs.cut_score;
                // Otherwise check partials (sorted by day desc)
                if (cs.partial_scores && cs.partial_scores.length > 0) {
                    const sorted = [...cs.partial_scores].sort((a: any, b: any) => b.day - a.day);
                    return sorted[0].score; // Latest partial
                }
                return 0;
            };

            const candidates = course.cut_scores
                .map((cs: any) => ({
                    ...cs,
                    _derivedCode: getModalityCode(cs.modality_name),
                    _effectiveScore: getEffectiveScore(cs)
                }))
                .filter((cs: any) => cs._effectiveScore > 0); // Only keep records with actual scores

            // Iterate years descending (2026 -> 2025 -> 2024)
            const relevantYears = Array.from(new Set(candidates.map((c: any) => c.year))).sort((a: any, b: any) => b - a);

            let finalCutScore = null;
            let finalYear = 0;

            for (const year of relevantYears) {
                const yearModalities = candidates.filter((c: any) => c.year === year);
                let match = null;

                // Try specific match
                if (modalityCode === 'ampla') {
                    match = yearModalities.find((m: any) => m.modality_name.toLowerCase().includes('ampla'));
                } else if (modalityCode === 'deficiencia') {
                    match = yearModalities.find((m: any) =>
                        ['L9', 'L10', 'L13', 'L14', 'deficiencia'].includes(m._derivedCode)
                    );
                } else {
                    match = yearModalities.find((m: any) => m._derivedCode === modalityCode);
                }

                if (match) {
                    finalCutScore = match;
                    finalYear = year as number;
                    break;
                }
            }

            if (!finalCutScore) {
                if (debugInfo.length < 10) debugInfo.push({
                    name: course.name,
                    reason: 'No matching cut score',
                    modalityCode,
                    availableModalities: candidates.map((c: any) => c.modality_name).slice(0, 3)
                });
                return null;
            }

            const cutScoreValue = finalCutScore._effectiveScore;

            return {
                courseId: course.id,
                courseCode: course.code,
                name: course.name,
                university: course.university,
                campus: course.campus,
                city: course.city,
                state: course.state,
                degree: course.degree,
                schedule: course.schedule,
                userScore,
                cutScore: cutScoreValue,
                cutScoreYear: finalYear,
                margin: userScore - cutScoreValue,
                modalityName: finalCutScore.modality_name,
                vacancies: finalCutScore.vacancies || 0, // Pass vacancies for UI
                applicants: finalCutScore.applicants || 0
            };
        })
            .filter(Boolean)
            .sort((a: any, b: any) => b.margin - a.margin);

        if (results.length === 0) {
            console.log('[Radar] No results found. Debug info:', JSON.stringify(debugInfo, null, 2));
            // Return debug info in a special header or simplified response if possible? 
            // Or just return empty list as before but logged.
            // Let's return the debug info in the body for now since development mode.
            return NextResponse.json({ results: [], debug: debugInfo });
        }

        return NextResponse.json(results);

    } catch (error) {
        console.error('Radar API Error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
