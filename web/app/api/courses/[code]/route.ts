import { NextRequest, NextResponse } from 'next/server'
import {
  buildCourseProvenance,
  buildCourseReference,
} from '@/lib/course-reference'
import { supabase } from '@/lib/supabase'
import type { CourseReference } from '@/types/course'

interface RouteParams {
  params: Promise<{ code: string }>
}

/**
 * GET /api/courses/[code]
 * Get full course data by SISU code
 *
 * Returns course info, weights, and latest cut scores
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { code: codeStr } = await params
  const code = Number(codeStr)

  if (!Number.isInteger(code) || code <= 0) {
    return NextResponse.json(
      { error: 'Invalid course code' },
      { status: 400 }
    )
  }

  try {
    // Get by SISU Code (the URL param is the SISU code, not internal ID)
    const result = await supabase.getFullCourseData(code)

    if (result.error) {
      console.error('Error fetching course from Supabase:', result.error)
      return NextResponse.json(
        { error: 'Unable to fetch course data' },
        { status: 502 }
      )
    }

    if (!result.data) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Transform cut scores to a more usable format
    const course = result.data
    const scoresByYear = new Map<number, typeof course.cut_scores>()

    for (const score of course.cut_scores) {
      const year = score.year
      if (!scoresByYear.has(year)) {
        scoresByYear.set(year, [])
      }
      scoresByYear.get(year)!.push(score)
    }

    // Get latest weights
    const latestWeights = course.weights[0] || null
    const generatedAt = new Date()
    const weightsByEdition = new Map(course.weights.map(weight => [weight.year, weight]))
    const referencesByScoreId = new Map<number, CourseReference>()
    for (const score of course.cut_scores) {
      const reference = buildCourseReference(
        course.code,
        score,
        weightsByEdition.get(score.year) || null,
        generatedAt
      )
      if (reference) referencesByScoreId.set(score.id, reference)
    }
    const references = Array.from(referencesByScoreId.values())
      .sort((left, right) => (
        right.edition - left.edition
        || left.modalityOfficialName.localeCompare(right.modalityOfficialName, 'pt-BR')
      ))
    const requestedModalityId = request.nextUrl.searchParams.get('modalityId')?.trim()
    if (
      requestedModalityId
      && !references.some(reference => reference.modalityId === requestedModalityId)
    ) {
      return NextResponse.json({
        error: 'NO_REFERENCE_FOR_MODALITY',
        code: 'NO_REFERENCE_FOR_MODALITY',
        modalityId: requestedModalityId,
      }, { status: 404 })
    }
    const responseReferences = requestedModalityId
      ? references.filter(reference => reference.modalityId === requestedModalityId)
      : references

    return NextResponse.json({
      course: {
        id: course.id,
        code: course.code,
        name: course.name,
        university: course.university,
        campus: course.campus,
        city: course.city,
        state: course.state,
        degree: course.degree,
        schedule: course.schedule,
        location: {
          latitude: course.latitude,
          longitude: course.longitude,
        },
      },
      weights: latestWeights ? {
        year: latestWeights.year,
        pesos: {
          redacao: latestWeights.peso_red,
          linguagens: latestWeights.peso_ling,
          matematica: latestWeights.peso_mat,
          humanas: latestWeights.peso_ch,
          natureza: latestWeights.peso_cn,
        },
        minimos: {
          redacao: latestWeights.min_red,
          linguagens: latestWeights.min_ling,
          matematica: latestWeights.min_mat,
          humanas: latestWeights.min_ch,
          natureza: latestWeights.min_cn,
          enem: latestWeights.min_enem,
        },
      } : null,
      cut_scores: Array.from(scoresByYear.entries())
        .sort(([leftYear], [rightYear]) => rightYear - leftYear)
        .map(([year, scores]) => ({
          year,
          modalities: scores
            .filter(score => {
              if (!requestedModalityId) return true
              return referencesByScoreId.get(score.id)?.modalityId === requestedModalityId
            })
            .sort((left, right) => left.modality_name.localeCompare(
              right.modality_name,
              'pt-BR'
            ))
            .map(score => {
              const reference = referencesByScoreId.get(score.id)

              return {
                // Legacy aliases are preserved for existing consumers.
                code: score.modality_code,
                name: score.modality_name,
                modality_code: score.modality_code,
                modality_name: score.modality_name,
                cut_score: score.cut_score,
                applicants: score.applicants,
                vacancies: score.vacancies,
                updated_at: score.captured_at,
                partial_scores: score.partial_scores || [],
                // Canonical, camelCase reference metadata.
                capturedAt: reference?.capturedAt || null,
                referenceType: reference?.referenceType || null,
                sourceUrl: reference?.sourceUrl || null,
                intermediary: reference?.intermediary || null,
                verification: reference?.verification || { status: 'stale' },
                reference: reference || null,
              }
            }),
        })),
      weights_history: course.weights.map(w => ({
        year: w.year,
        pesos: {
          redacao: w.peso_red,
          linguagens: w.peso_ling,
          matematica: w.peso_mat,
          humanas: w.peso_ch,
          natureza: w.peso_cn,
        },
        minimos: {
          redacao: w.min_red,
          linguagens: w.min_ling,
          matematica: w.min_mat,
          humanas: w.min_ch,
          natureza: w.min_cn,
          enem: w.min_enem,
        },
      })),
      references: responseReferences,
      provenance: buildCourseProvenance(course.code, responseReferences, generatedAt),
    })
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
