import { cache } from 'react'

import { buildCourseReference } from '@/lib/course-reference'
import { groupCoursesByUniversity, type UniversityGroup } from '@/lib/course-seo'
import { supabase, type Course, type CourseWeights } from '@/lib/supabase'
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
