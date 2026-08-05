import type { CourseWeights, CutScore } from '@/lib/supabase'
import type {
  CourseProvenance,
  CourseReference,
  PartialScoreReference,
  ReferenceType,
  ReferenceVerification,
} from '@/types/course'

const DEFAULT_MEUSISU_API_URL = 'https://d3hf41n0t98fq2.cloudfront.net/api'
const OFFICIAL_SISU_SOURCE_URL = 'https://sisu.mec.gov.br/vagas'
const STALE_AFTER_MS = 36 * 60 * 60 * 1000

function isValidReferenceScore(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= 1000
}

function getCaptureUrl(courseCode: number): string {
  const baseUrl = process.env.MEUSISU_API_URL || DEFAULT_MEUSISU_API_URL
  const params = new URLSearchParams({ courseCode: String(courseCode) })
  return `${baseUrl.replace(/\/$/, '')}/getCourseData?${params.toString()}`
}

function getReferenceType(
  score: CutScore,
  activeEdition: number | null
): ReferenceType | null {
  const hasValidPartial = (score.partial_scores || []).some(partial => (
    Number.isFinite(Number(partial.day)) && isValidReferenceScore(partial.score)
  ))
  const hasValidFinal = isValidReferenceScore(score.cut_score)
  if (!hasValidPartial && !hasValidFinal) {
    return null
  }

  if (score.year !== activeEdition) {
    return 'historical'
  }

  if (hasValidPartial) {
    return 'partial'
  }

  if (hasValidFinal) {
    return 'final'
  }

  return null
}

function resolveActiveEdition(score: CutScore, now: Date): number | null {
  const configured = Number(process.env.SISU_ACTIVE_EDITION)
  if (Number.isInteger(configured) && configured > 0) return configured

  const capturedTimestamp = score.captured_at ? Date.parse(score.captured_at) : Number.NaN
  const captureAge = now.getTime() - capturedTimestamp
  const recentlyCaptured = Number.isFinite(capturedTimestamp)
    && captureAge >= 0
    && captureAge <= STALE_AFTER_MS
  return recentlyCaptured && score.year === now.getUTCFullYear() ? score.year : null
}

export function getReferenceVerification(
  capturedAt: string | null,
  referenceType: ReferenceType | null = null,
  now: Date = new Date()
): ReferenceVerification {
  if (referenceType === 'historical') {
    return 'unverified'
  }
  if (!capturedAt) {
    return 'stale'
  }

  const capturedTimestamp = Date.parse(capturedAt)
  if (!Number.isFinite(capturedTimestamp)) {
    return 'stale'
  }

  return now.getTime() - capturedTimestamp > STALE_AFTER_MS
    ? 'stale'
    : 'unverified'
}

export function buildCourseReference(
  courseCode: number,
  score: CutScore,
  weights: CourseWeights | null = null,
  now: Date = new Date(),
  activeEdition: number | null = resolveActiveEdition(score, now)
): CourseReference | null {
  const referenceType = getReferenceType(score, activeEdition)
  if (!referenceType) {
    return null
  }

  const partialScores: PartialScoreReference[] = (score.partial_scores || [])
    .filter(partial => (
      Number.isFinite(Number(partial.day)) && isValidReferenceScore(partial.score)
    ))
    .map(partial => ({
      day: partial.day,
      score: partial.score,
    }))

  return {
    courseCode,
    edition: score.year,
    modalityId: score.modality_code === null ? '' : String(score.modality_code),
    modalityOfficialName: score.modality_name,
    cutoff: isValidReferenceScore(score.cut_score) ? score.cut_score : null,
    referenceType,
    partialScores,
    capturedAt: score.captured_at || null,
    weightsEdition: weights?.year ?? null,
    minimums: weights ? {
      redacao: weights.min_red,
      linguagens: weights.min_ling,
      matematica: weights.min_mat,
      humanas: weights.min_ch,
      natureza: weights.min_cn,
      enem: weights.min_enem,
    } : null,
    sourceUrl: OFFICIAL_SISU_SOURCE_URL,
    intermediary: 'MeuSISU',
    intermediaryUrl: getCaptureUrl(courseCode),
    verification: {
      status: getReferenceVerification(score.captured_at || null, referenceType, now),
      checkedAt: now.toISOString(),
    },
  }
}

export function buildCourseProvenance(
  courseCode: number,
  references: CourseReference[],
  now: Date = new Date()
): CourseProvenance {
  const capturedAt = references
    .map(reference => reference.capturedAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] || null

  return {
    generatedAt: now.toISOString(),
    capturedAt,
    sourceUrl: OFFICIAL_SISU_SOURCE_URL,
    intermediary: {
      name: 'MeuSISU',
      url: getCaptureUrl(courseCode),
    },
    verification: references.some(reference => reference.verification.status === 'unverified')
      ? 'unverified'
      : 'stale',
  }
}
