import type { CourseReference, PartialScoreReference } from '@/types/course'

export type ReferenceSelectionError =
  | 'NO_REFERENCE_FOR_MODALITY'
  | 'NO_VALID_REFERENCE'

export type ReferenceSelection =
  | { ok: true; reference: CourseReference; cutoff: number }
  | { ok: false; error: ReferenceSelectionError }

export function isValidSisuScore(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= 1000
}

function partialDayValue(partial: PartialScoreReference): number {
  const value = Number(partial.day)
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY
}

/** Returns the final value or the most recent valid partial, without mutating input. */
export function getEffectiveCutoff(reference: CourseReference): number | null {
  if (isValidSisuScore(reference.cutoff)) return reference.cutoff

  const latestPartial = reference.partialScores
    .filter(partial => isValidSisuScore(partial.score))
    .reduce<PartialScoreReference | null>((latest, partial) => {
      if (!latest || partialDayValue(partial) > partialDayValue(latest)) return partial
      return latest
    }, null)

  return latestPartial?.score ?? null
}

/**
 * Selects only an exact official modality id. It deliberately has no Ampla or
 * name-based fallback.
 */
export function selectLatestReference(
  references: CourseReference[],
  modalityId: string,
): ReferenceSelection {
  const exactReferences = references.filter(reference => (
    reference.modalityId !== '' && reference.modalityId === modalityId
  ))

  if (exactReferences.length === 0) {
    return { ok: false, error: 'NO_REFERENCE_FOR_MODALITY' }
  }

  const usable = exactReferences
    .map(reference => ({ reference, cutoff: getEffectiveCutoff(reference) }))
    .filter((item): item is { reference: CourseReference; cutoff: number } => (
      item.cutoff !== null
    ))
    .sort((left, right) => right.reference.edition - left.reference.edition)

  if (usable.length === 0) {
    return { ok: false, error: 'NO_VALID_REFERENCE' }
  }

  return { ok: true, ...usable[0] }
}
