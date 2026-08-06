import type { CutScore } from '@/lib/supabase'

export type ModalityFamily =
  | 'broad-competition'
  | 'public-school'
  | 'public-school-low-income'
  | 'public-school-ppi'
  | 'public-school-low-income-ppi'
  | 'public-school-pcd'
  | 'public-school-low-income-pcd'
  | 'public-school-ppi-pcd'
  | 'public-school-low-income-ppi-pcd'
  | 'public-school-quilombola'
  | 'public-school-low-income-quilombola'
  | 'institutional-pcd'
  | 'unknown'

export interface ApprovedScoreRow {
  year: number
  modality_code: number
  score: number
  /**
   * Legacy database name. In the source protobuf this field is `semestre`,
   * not the admission call number.
   */
  call_number: number
}

export interface StatisticsModality {
  id: string
  name: string
  family: ModalityFamily
}

export interface StatisticsPartialPoint {
  day: number
  score: number
}

export interface StatisticsPartialSeries {
  edition: number
  /** `cut_scores` currently has no semester column, so this is never guessed. */
  semester: number | null
  points: StatisticsPartialPoint[]
}

export type StatisticsReferenceType = 'final' | 'partial' | null

export interface StatisticsCutoffHistoryItem {
  edition: number
  /** `cut_scores` currently has no semester column, so this is never guessed. */
  semester: number | null
  cutoff: number | null
  effectiveCutoff: number | null
  referenceType: StatisticsReferenceType
  partialDay: number | null
  applicants: number | null
  vacancies: number | null
  capturedAt: string | null
  modalityName: string
}

export interface ApprovedScoreSummary {
  edition: number
  semester: number | null
  /** The stored dataset represents the regular (first) admission call. */
  admissionCall: 1
  count: number
  mean: number
  median: number
  min: number
  max: number
}

export interface CourseStatisticsResponse {
  courseCode: number
  modality: StatisticsModality
  partialSeries: StatisticsPartialSeries[]
  cutoffHistory: StatisticsCutoffHistoryItem[]
  approvedScoreSummary: ApprovedScoreSummary[]
  /** Area-level ENEM scores are not stored in `approved_students`. */
  approvedAreaAverages: []
  generatedAt: string
}

export interface ResolvedStatisticsModality {
  modality: StatisticsModality
  rows: CutScore[]
  compatibleModalityCodes: Set<number>
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Builds a semantic family from the official modality description.
 *
 * The dimensions are intentionally strict. Unknown descriptions never map to
 * broad competition and are therefore comparable only by their exact id.
 */
export function getModalityFamily(modalityName: string): ModalityFamily {
  const name = normalizeText(modalityName)
  if (!name) return 'unknown'
  if (name.includes('ampla concorrencia')) return 'broad-competition'

  const isQuilombola = name.includes('quilombola')
  const isPcd = name.includes('deficiencia')
  const isPpi = name.includes('pretos')
    && name.includes('pardos')
    && name.includes('indigen')
  const isLowIncome = name.includes('renda familiar bruta per capita igual ou inferior')
    || name.includes('baixa renda')
  const isPublicSchool = name.includes('ensino medio em escolas publicas')
    || name.includes('ensino medio em escola publica')
    || name.includes('tenham cursado integralmente o ensino medio na rede publica')

  const isInstitutionalPcd = isPcd
    && !isPublicSchool
    && (
      name.includes('rede de ensino privada ou publica')
      || name.includes('rede privada ou publica')
    )
  if (isInstitutionalPcd) return 'institutional-pcd'
  if (!isPublicSchool) return 'unknown'

  if (isQuilombola) {
    return isLowIncome
      ? 'public-school-low-income-quilombola'
      : 'public-school-quilombola'
  }

  if (isPpi && isPcd) {
    return isLowIncome
      ? 'public-school-low-income-ppi-pcd'
      : 'public-school-ppi-pcd'
  }

  if (isPpi) {
    return isLowIncome
      ? 'public-school-low-income-ppi'
      : 'public-school-ppi'
  }

  if (isPcd) {
    return isLowIncome
      ? 'public-school-low-income-pcd'
      : 'public-school-pcd'
  }

  return isLowIncome ? 'public-school-low-income' : 'public-school'
}

function timestamp(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function compareRows(left: CutScore, right: CutScore, requestedId: string): number {
  const leftExact = String(left.modality_code ?? '') === requestedId ? 1 : 0
  const rightExact = String(right.modality_code ?? '') === requestedId ? 1 : 0
  return right.year - left.year
    || rightExact - leftExact
    || timestamp(right.captured_at) - timestamp(left.captured_at)
    || right.id - left.id
}

/** Resolves an exact requested id and then its strict semantic historical family. */
export function resolveStatisticsModality(
  scores: CutScore[],
  requestedId: string,
): ResolvedStatisticsModality | null {
  const exactRows = scores
    .filter(score => String(score.modality_code ?? '') === requestedId)
    .sort((left, right) => compareRows(left, right, requestedId))
  const target = exactRows[0]
  if (!target) return null

  const family = getModalityFamily(target.modality_name)
  const rows = scores.filter(score => {
    if (String(score.modality_code ?? '') === requestedId) return true
    return family !== 'unknown' && getModalityFamily(score.modality_name) === family
  })

  return {
    modality: {
      id: requestedId,
      name: target.modality_name,
      family,
    },
    rows,
    compatibleModalityCodes: new Set(rows.flatMap(score => (
      score.modality_code === null ? [] : [score.modality_code]
    ))),
  }
}

function validScore(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= 1000
}

function validCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function normalizePartialPoints(score: CutScore): StatisticsPartialPoint[] {
  const byDay = new Map<number, number>()
  for (const partial of score.partial_scores || []) {
    const day = Number(partial.day)
    if (!Number.isInteger(day) || day <= 0 || !validScore(partial.score)) continue
    byDay.set(day, partial.score)
  }

  return Array.from(byDay, ([day, value]) => ({ day, score: value }))
    .sort((left, right) => left.day - right.day)
}

/** Picks one captured row per edition without merging distinct modalities. */
function selectEditionRows(rows: CutScore[], requestedId: string): CutScore[] {
  const selected = new Map<number, CutScore>()
  const sorted = [...rows].sort((left, right) => compareRows(left, right, requestedId))
  for (const row of sorted) {
    if (!selected.has(row.year)) selected.set(row.year, row)
  }
  return Array.from(selected.values()).sort((left, right) => left.year - right.year)
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function median(sortedValues: number[]): number {
  const middle = Math.floor(sortedValues.length / 2)
  if (sortedValues.length % 2 === 1) return sortedValues[middle]
  return (sortedValues[middle - 1] + sortedValues[middle]) / 2
}

function buildApprovedSummaries(
  students: ApprovedScoreRow[],
  compatibleModalityCodes: Set<number>,
): ApprovedScoreSummary[] {
  const groups = new Map<string, { edition: number; semester: number | null; scores: number[] }>()

  for (const student of students) {
    if (!compatibleModalityCodes.has(student.modality_code) || !validScore(student.score)) continue
    if (!Number.isInteger(student.year) || student.year <= 0) continue

    const semester = Number.isInteger(student.call_number) && student.call_number > 0
      ? student.call_number
      : null
    const key = `${student.year}-${semester ?? 'unknown'}`
    const group = groups.get(key) || { edition: student.year, semester, scores: [] }
    group.scores.push(student.score)
    groups.set(key, group)
  }

  return Array.from(groups.values())
    .filter(group => group.scores.length > 0)
    .map(group => {
      const values = [...group.scores].sort((left, right) => left - right)
      return {
        edition: group.edition,
        semester: group.semester,
        admissionCall: 1 as const,
        count: values.length,
        mean: round(values.reduce((total, value) => total + value, 0) / values.length),
        median: round(median(values)),
        min: values[0],
        max: values[values.length - 1],
      }
    })
    .sort((left, right) => left.edition - right.edition
      || (left.semester ?? Number.MAX_SAFE_INTEGER) - (right.semester ?? Number.MAX_SAFE_INTEGER))
}

export function buildCourseStatistics(
  courseCode: number,
  requestedModalityId: string,
  scores: CutScore[],
  students: ApprovedScoreRow[],
  generatedAt: Date = new Date(),
): CourseStatisticsResponse | null {
  const resolved = resolveStatisticsModality(scores, requestedModalityId)
  if (!resolved) return null

  const editionRows = selectEditionRows(resolved.rows, requestedModalityId)
  const partialSeries = editionRows.flatMap(row => {
    const points = normalizePartialPoints(row)
    return points.length > 0 ? [{ edition: row.year, semester: null, points }] : []
  })

  const cutoffHistory = editionRows.map(row => {
    const points = normalizePartialPoints(row)
    const latestPartial = points[points.length - 1] || null
    const cutoff = validScore(row.cut_score) ? row.cut_score : null
    const effectiveCutoff = cutoff ?? latestPartial?.score ?? null
    const referenceType: StatisticsReferenceType = cutoff !== null
      ? 'final'
      : latestPartial
        ? 'partial'
        : null

    return {
      edition: row.year,
      semester: null,
      cutoff,
      effectiveCutoff,
      referenceType,
      partialDay: referenceType === 'partial' ? latestPartial?.day ?? null : null,
      applicants: validCount(row.applicants) ? row.applicants : null,
      vacancies: validCount(row.vacancies) ? row.vacancies : null,
      capturedAt: row.captured_at || null,
      modalityName: row.modality_name,
    }
  })

  return {
    courseCode,
    modality: resolved.modality,
    partialSeries,
    cutoffHistory,
    approvedScoreSummary: buildApprovedSummaries(
      students,
      resolved.compatibleModalityCodes,
    ),
    approvedAreaAverages: [],
    generatedAt: generatedAt.toISOString(),
  }
}
