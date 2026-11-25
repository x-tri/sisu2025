import { cache } from 'react'

import { buildCourseReference } from '@/lib/course-reference'
import { AMPLA_MODALITY_ID, groupCoursesByUniversity, type UniversityGroup } from '@/lib/course-seo'
import {
  buildMedicineOffer,
  groupMedicineByUniversity,
  isMedicineCourse,
  type MedicineOffer,
  type MedicineUniversity,
} from '@/lib/medicine-seo'
import { supabase, type Course, type CourseWeights, type CutScore } from '@/lib/supabase'
import type { CourseReference, CourseSearchItem } from '@/types/course'

export interface CoursePageData {
  course: Course
  latestWeights: CourseWeights | null
  references: CourseReference[]
}

/**
 * Course, weights and note references for the public course page.
 * Returns null when the course does not exist; throws when the database fails,
 * so a transient error is never rendered (or cached) as "not found".
 */
export const loadCoursePage = cache(async (code: number): Promise<CoursePageData | null> => {
  const result = await supabase.getFullCourseData(code)
  if (!result.data) {
    if (result.error && result.error !== 'Course not found') throw new Error(result.error)
    return null
  }

  const { weights, cut_scores: cutScores, ...course } = result.data
  const now = new Date()
  const weightsByEdition = new Map(weights.map(weight => [weight.year, weight]))
  const references = cutScores
    .map(score => buildCourseReference(course.code, score, weightsByEdition.get(score.year) || null, now))
    .filter((reference): reference is CourseReference => reference !== null)

  return { course, latestWeights: weights[0] || null, references }
})

export const loadCourseCatalog = cache(async (): Promise<CourseSearchItem[]> => {
  const result = await supabase.getCourseCatalog()
  if (!result.data) throw new Error(result.error || 'Course catalog unavailable')
  return result.data
})

export const loadUniversities = cache(async (): Promise<UniversityGroup[]> => (
  groupCoursesByUniversity(await loadCourseCatalog())
))

const MEDICINE_BATCH_SIZE = 80

/** Every Medicina offer of the catalog with its ampla concorrência cut-offs. */
export const loadMedicineOffers = cache(async (): Promise<MedicineOffer[]> => {
  const courses = (await loadCourseCatalog()).filter(course => isMedicineCourse(course.name))
  const scoresByCourse = new Map<number, CutScore[]>()

  for (let start = 0; start < courses.length; start += MEDICINE_BATCH_SIZE) {
    const batch = courses.slice(start, start + MEDICINE_BATCH_SIZE)
    const result = await supabase.getCoursePreviewCutScores(
      batch.map(course => course.id),
      Number(AMPLA_MODALITY_ID),
    )
    if (result.error) throw new Error(result.error)
    for (const score of result.data || []) {
      const list = scoresByCourse.get(score.course_id) ?? []
      list.push(score)
      scoresByCourse.set(score.course_id, list)
    }
  }

  const now = new Date()
  return courses.map(course => {
    const references = (scoresByCourse.get(course.id) ?? [])
      .map(score => buildCourseReference(course.code, score, null, now))
      .filter((reference): reference is CourseReference => reference !== null)
    return buildMedicineOffer(course, references)
  })
})

export async function loadUniversity(slug: string): Promise<UniversityGroup | null> {
  return (await loadUniversities()).find(university => university.slug === slug) ?? null
}

export async function loadMedicineUniversity(slug: string): Promise<MedicineUniversity | null> {
  return groupMedicineByUniversity(await loadMedicineOffers()).find(university => university.slug === slug) ?? null
}
