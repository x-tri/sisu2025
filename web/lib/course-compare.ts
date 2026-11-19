/**
 * Pure helpers to compare the visitor's weighted ENEM score against each
 * course's reference cutoff. Used by the home-page "where you would pass" and
 * "closest to passing" features.
 *
 * All functions are deterministic and keep the reference rules in one place so
 * the result cards, the pass filter and the closest-offer list stay consistent.
 */

import {
  calculateWeightedScore,
  getScoreMargin,
  type ScoreMarginRelation,
  type Scores,
} from './score-core';
import type { CourseSearchItem } from '../types/course';

/**
 * Resolves the numeric reference cutoff for a course, falling back to the last
 * partial score when the canonical cutoff is absent or zero.
 */
export function courseCutoff(course: CourseSearchItem): number | null {
  const reference = course.reference;
  if (!reference) return null;
  if (typeof reference.cutoff === 'number' && reference.cutoff > 0) return reference.cutoff;
  const partials = [...reference.partialScores]
    .filter(partial => Number.isFinite(Number(partial.day)) && Number(partial.score) > 0)
    .sort((left, right) => Number(left.day) - Number(right.day));
  return partials[partials.length - 1]?.score ?? null;
}

/**
 * The visitor's weighted score for a course, or null when there are no valid
 * scores or the offer has no usable weights.
 */
export function courseWeightedScore(
  scores: Scores | null,
  course: CourseSearchItem,
): number | null {
  if (!scores || !course.weights) return null;
  return calculateWeightedScore(scores, course.weights).average;
}

/**
 * Whether the visitor passes this course (weighted score at or above the
 * reference cutoff). Returns null when the offer cannot be evaluated (missing
 * scores, weights or reference).
 */
export function courseMakesIt(
  scores: Scores | null,
  course: CourseSearchItem,
): boolean | null {
  const weighted = courseWeightedScore(scores, course);
  const cutoff = courseCutoff(course);
  if (weighted === null || cutoff === null) return null;
  const margin = getScoreMargin(weighted, cutoff);
  if (margin.relation === 'unavailable' || margin.points === null) return null;
  return margin.points > 0 || margin.relation === 'equal';
}

/** Courses on which the visitor is at or above the reference cutoff. */
export function passableCourses(
  courses: CourseSearchItem[],
  scores: Scores | null,
): CourseSearchItem[] {
  return courses.filter(course => courseMakesIt(scores, course) === true);
}

export interface ClosestCourseComparison {
  course: CourseSearchItem;
  weighted: number;
  cutoff: number;
  distance: number;
  relation: Exclude<ScoreMarginRelation, 'unavailable'>;
}

/**
 * The offers where the visitor's weighted score is closest to the reference
 * cutoff (smallest absolute distance). Surfaces the actionable near-misses:
 * both just-below (about to pass) and just-above (tight race). Limited to the
 * first `limit` unique offers.
 */
export function closestPassing(
  courses: CourseSearchItem[],
  scores: Scores | null,
  limit = 5,
): ClosestCourseComparison[] {
  if (!scores) return [];

  const seen = new Set<number>();
  const ranked: ClosestCourseComparison[] = [];

  for (const course of courses) {
    if (seen.has(course.id)) continue;
    const weighted = courseWeightedScore(scores, course);
    const cutoff = courseCutoff(course);
    if (weighted === null || cutoff === null) continue;
    const margin = getScoreMargin(weighted, cutoff);
    if (margin.relation === 'unavailable' || margin.points === null) continue;

    seen.add(course.id);
    ranked.push({
      course,
      weighted,
      cutoff,
      distance: Math.abs(margin.points),
      relation: margin.relation === 'equal' ? 'equal' : margin.relation,
    });
  }

  ranked.sort((left, right) => left.distance - right.distance);
  return ranked.slice(0, limit);
}