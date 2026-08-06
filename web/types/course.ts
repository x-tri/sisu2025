/**
 * Shared API contracts for course references, provenance, search and coverage.
 *
 * These types intentionally distinguish the stored value from its verification
 * status. The BFF must never promote an upstream value to `verified` because the
 * database currently stores no evidence of an official MEC verification.
 */

export type ReferenceType = 'partial' | 'final' | 'historical'

export type VerificationStatus = 'verified' | 'unverified' | 'stale' | 'conflict'

// Kept as an alias for the coverage contract and older server helpers.
export type ReferenceVerification = VerificationStatus

export interface ReferenceIntermediary {
  name: string
  url: string
}

export interface PartialScoreReference {
  day: string | number
  score: number
}

export interface EnemMinimums {
  redacao: number | null
  linguagens: number | null
  matematica: number | null
  humanas: number | null
  natureza: number | null
  enem: number | null
}

/** Canonical note reference returned by the Next.js BFF. */
export interface CutoffReference {
  courseCode: number
  edition: number
  modalityId: string
  modalityOfficialName: string
  cutoff: number | null
  referenceType: ReferenceType
  partialScores: PartialScoreReference[]
  capturedAt: string | null
  weightsEdition: number | null
  minimums: EnemMinimums | null
  sourceUrl: string
  intermediary?: string
  intermediaryUrl?: string
  verification: {
    status: VerificationStatus
    checkedAt?: string
  }
}

export type CourseReference = CutoffReference

export interface CourseProvenance {
  generatedAt: string
  capturedAt: string | null
  sourceUrl: string
  intermediary: ReferenceIntermediary
  verification: VerificationStatus
}

export interface CourseSearchItem {
  id: number
  code: number
  name: string
  university: string | null
  campus: string | null
  city: string | null
  state: string | null
  degree: string | null
  schedule: string | null
  universityAcronym?: string | null
  weightSummary?: string | null
  reference?: CourseReference | null
}

export interface PaginationMetadata {
  page: number
  limit: number
  offset: number
  returned: number
  total: number
  totalPages: number
  hasNextPage: boolean
}

export interface CourseSearchResponse {
  courses: CourseSearchItem[]
  query: string | null
  count: number
  total: number
  limit: number
  offset: number
  pagination: PaginationMetadata
}

export interface CourseCoverageResponse {
  generatedAt: string
  capturedAt: string | null
  verification: ReferenceVerification
  sourceUrl: string
  intermediary: ReferenceIntermediary
  coverage: {
    courses: {
      rows: number
      states: number
      cities: number
      institutions: number
      presentStates: string[]
      missingStates: string[]
    }
    weights: {
      rows: number
    }
    cutScores: {
      rows: number
      latestEdition: number | null
      latestCapturedAt: string | null
    }
  }
}
