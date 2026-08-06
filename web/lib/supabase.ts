/**
 * Supabase Server Client
 * Uses service_role key for backend operations only
 */

import type { CourseSearchItem } from '@/types/course'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sisymqzxvuktdcbsbpbp.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

interface SupabaseResponse<T> {
  data: T | null
  error: string | null
  count?: number
}

export interface CourseSearchFilters {
  query?: string
  course?: string
  institution?: string
  city?: string
  state?: string
}

export interface CourseCoverageRow {
  id: number
  state: string | null
  city: string | null
  university: string | null
}

export interface LatestCutScoreMetadata {
  year: number
  captured_at: string | null
}

type CoverageTable = 'course_weights' | 'cut_scores'

function normalizeSearchTerm(value: string): string {
  return value
    .replace(/[(),%*"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getCutScoreIdentity(score: CutScore): string {
  const modality = score.modality_code === null
    ? `name:${score.modality_name.trim().toLocaleLowerCase('pt-BR')}`
    : `code:${score.modality_code}`

  return `${score.year}-${modality}`
}

class SupabaseServer {
  private url: string
  private headers: Record<string, string>

  constructor() {
    this.url = SUPABASE_URL
    this.headers = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    }
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<SupabaseResponse<T>> {
    try {
      const response = await fetch(`${this.url}/rest/v1/${endpoint}`, {
        ...options,
        cache: 'no-store',
        headers: {
          ...this.headers,
          ...options.headers,
        },
      })

      if (!response.ok) {
        const error = await response.text()
        return { data: null, error }
      }

      const data = await response.json()
      const contentRange = response.headers.get('content-range')
      const total = contentRange?.split('/')[1]
      const parsedCount = total && total !== '*' ? Number.parseInt(total, 10) : undefined
      const count = Number.isFinite(parsedCount) ? parsedCount : undefined

      return { data, error: null, count }
    } catch (error) {
      return { data: null, error: String(error) }
    }
  }

  /**
   * Search courses by name, university, or city
   */
  async searchCourses(query: string, limit = 20) {
    return this.searchCoursesRankedPaginated({ query }, limit, 0)
  }

  private buildCourseSearchParams(
    filters: CourseSearchFilters,
    limit: number,
    offset: number
  ): URLSearchParams {
    const params = new URLSearchParams({
      select: 'id,code,name,university,campus,city,state,degree,schedule',
      order: 'name.asc,code.asc',
      limit: String(limit),
      offset: String(offset),
    })

    const query = filters.query ? normalizeSearchTerm(filters.query) : ''
    if (query) {
      params.set(
        'or',
        `(name.ilike.*${query}*,university.ilike.*${query}*,city.ilike.*${query}*)`
      )
    }

    const course = filters.course ? normalizeSearchTerm(filters.course) : ''
    if (course) {
      params.set('name', `ilike.*${course}*`)
    }

    const institution = filters.institution
      ? normalizeSearchTerm(filters.institution)
      : ''
    if (institution) {
      params.set('university', `ilike.*${institution}*`)
    }

    const city = filters.city ? normalizeSearchTerm(filters.city) : ''
    if (city) {
      params.set('city', `ilike.*${city}*`)
    }

    const state = filters.state ? normalizeSearchTerm(filters.state).toUpperCase() : ''
    if (state) {
      params.set('state', `eq.${state}`)
    }

    return params
  }

  /**
   * Search courses with exact pagination metadata.
   *
   * General query matches course, institution or city. Explicit filters are
   * combined with AND and do not imply a modality or any other fallback.
   */
  async searchCoursesPaginated(
    filters: CourseSearchFilters,
    limit = 20,
    offset = 0
  ) {
    const params = this.buildCourseSearchParams(filters, limit, offset)

    return this.request<CourseSearchItem[]>(`courses?${params}`, {
      headers: { 'Prefer': 'count=exact' },
    })
  }

  /**
   * Search with stable relevance pagination.
   *
   * Course names that start with the query are returned before matches found
   * in the middle of a name, institution or city. The two disjoint result
   * groups preserve exact counts and offsets without loading the whole table.
   */
  async searchCoursesRankedPaginated(
    filters: CourseSearchFilters,
    limit = 20,
    offset = 0
  ): Promise<SupabaseResponse<CourseSearchItem[]>> {
    const query = filters.query ? normalizeSearchTerm(filters.query) : ''
    if (!query) {
      return this.searchCoursesPaginated(filters, limit, offset)
    }

    const prefixParams = this.buildCourseSearchParams(filters, limit, offset)
    prefixParams.delete('or')
    prefixParams.append('name', `ilike.${query}*`)

    const prefixResult = await this.request<CourseSearchItem[]>(`courses?${prefixParams}`, {
      headers: { 'Prefer': 'count=exact' },
    })
    if (prefixResult.error) return prefixResult

    const prefixCourses = prefixResult.data || []
    const prefixCount = prefixResult.count ?? prefixCourses.length
    const remainingLimit = Math.max(0, limit - prefixCourses.length)
    const remainderOffset = Math.max(0, offset - prefixCount)
    const remainderParams = this.buildCourseSearchParams(
      filters,
      remainingLimit,
      remainderOffset
    )
    remainderParams.append('name', `not.ilike.${query}*`)

    const remainderResult = await this.request<CourseSearchItem[]>(`courses?${remainderParams}`, {
      headers: { 'Prefer': 'count=exact' },
    })
    if (remainderResult.error) return remainderResult

    const remainderCourses = remainderResult.data || []
    const remainderCount = remainderResult.count ?? remainderCourses.length

    return {
      data: [...prefixCourses, ...remainderCourses],
      error: null,
      count: prefixCount + remainderCount,
    }
  }

  /**
   * Get all courses (paginated)
   */
  async getCourses(limit = 50, offset = 0) {
    const params = new URLSearchParams({
      select: 'id,code,name,university,campus,city,state,degree,schedule',
      order: 'name',
      limit: String(limit),
      offset: String(offset),
    })

    return this.request<Course[]>(`courses?${params}`, {
      headers: { 'Prefer': 'count=exact' },
    })
  }

  /**
   * Load the exact Ampla-concorrência references used by result-card previews.
   * The modality id is explicit; callers must not replace a missing row with a
   * different modality.
   */
  async getCoursePreviewCutScores(courseIds: number[], modalityCode = 41) {
    const ids = courseIds.filter(id => Number.isInteger(id) && id > 0)
    if (ids.length === 0) {
      return { data: [] as CutScore[], error: null }
    }

    const params = new URLSearchParams({
      select: 'id,course_id,year,modality_code,modality_name,cut_score,applicants,vacancies,captured_at,partial_scores',
      course_id: `in.(${ids.join(',')})`,
      modality_code: `eq.${modalityCode}`,
      order: 'year.desc,captured_at.desc',
      limit: String(Math.min(ids.length * 12, 1000)),
    })

    return this.request<CutScore[]>(`cut_scores?${params}`)
  }

  /** Load weights for the same editions represented in result-card previews. */
  async getCoursePreviewWeights(courseIds: number[]) {
    const ids = courseIds.filter(id => Number.isInteger(id) && id > 0)
    if (ids.length === 0) {
      return { data: [] as CourseWeights[], error: null }
    }

    const params = new URLSearchParams({
      select: 'id,course_id,year,peso_red,peso_ling,peso_mat,peso_ch,peso_cn,min_red,min_ling,min_mat,min_ch,min_cn,min_enem',
      course_id: `in.(${ids.join(',')})`,
      order: 'year.desc',
      limit: String(Math.min(ids.length * 8, 1000)),
    })

    return this.request<CourseWeights[]>(`course_weights?${params}`)
  }

  /**
   * Count stored rows without downloading the table.
   */
  async countCoverageRows(table: CoverageTable) {
    const params = new URLSearchParams({
      select: 'id',
      limit: '1',
    })

    return this.request<Array<{ id: number }>>(`${table}?${params}`, {
      headers: { 'Prefer': 'count=exact' },
    })
  }

  /**
   * Fetch all course geography fields in API-sized batches. We deliberately
   * avoid `count=exact` here: on the production PostgREST instance that count
   * can exceed the statement timeout even though the paginated rows are fast.
   * Walking until the first short page still produces the exact row total.
   */
  async getCourseCoverageRows(batchSize = 1000) {
    const getBatch = (offset: number) => {
      const params = new URLSearchParams({
        select: 'id,state,city,university',
        order: 'id.asc',
        limit: String(batchSize),
        offset: String(offset),
      })

      return this.request<CourseCoverageRow[]>(`courses?${params}`)
    }

    const rows: CourseCoverageRow[] = []
    const concurrency = 4
    let offset = 0

    while (offset < 100_000) {
      const offsets = Array.from(
        { length: concurrency },
        (_, index) => offset + index * batchSize
      )
      const batches = await Promise.all(offsets.map(getBatch))
      const failedBatch = batches.find(batch => batch.error || !batch.data)

      if (failedBatch) {
        return {
          data: null,
          error: failedBatch.error || 'Incomplete course coverage response',
          count: rows.length,
        }
      }

      for (const batch of batches) {
        const data = batch.data || []
        rows.push(...data)
        if (data.length < batchSize) {
          return { data: rows, error: null, count: rows.length }
        }
      }

      offset += concurrency * batchSize
    }

    return {
      data: null,
      error: 'Course coverage exceeded the safe pagination limit',
      count: rows.length,
    }
  }

  async getLatestCutScoreMetadata() {
    const params = new URLSearchParams({
      select: 'year,captured_at',
      order: 'year.desc,captured_at.desc',
      limit: '1',
    })

    return this.request<LatestCutScoreMetadata[]>(`cut_scores?${params}`)
  }

  getDataApiUrl(): string {
    return `${this.url}/rest/v1`
  }

  /**
   * Get course by SISU code
   */
  async getCourseByCode(code: number) {
    const params = new URLSearchParams({
      code: `eq.${code}`,
    })

    const result = await this.request<Course[]>(`courses?${params}`)
    return {
      data: result.data?.[0] || null,
      error: result.error,
    }
  }

  /**
   * Get course weights for a specific year
   */
  async getCourseWeights(courseId: number, year?: number) {
    const params = new URLSearchParams({
      course_id: `eq.${courseId}`,
      order: 'year.desc',
    })
    if (year) {
      params.set('year', `eq.${year}`)
    }

    return this.request<CourseWeights[]>(`course_weights?${params}`)
  }

  /**
   * Get latest cut scores for a course
   */
  async getLatestCutScores(courseId: number, year?: number) {
    const params = new URLSearchParams({
      course_id: `eq.${courseId}`,
      order: 'captured_at.desc',
    })
    if (year) {
      params.set('year', `eq.${year}`)
    }

    return this.request<CutScore[]>(`cut_scores?${params}`)
  }

  /**
   * Get course by ID
   */
  async getCourseById(id: number) {
    const params = new URLSearchParams({
      id: `eq.${id}`,
    })

    const result = await this.request<Course[]>(`courses?${params}`)
    return {
      data: result.data?.[0] || null,
      error: result.error,
    }
  }

  /**
   * Get full course data by ID with weights and cut scores
   */
  async getFullCourseDataById(id: number) {
    // Get course
    const courseResult = await this.getCourseById(id)
    if (!courseResult.data) {
      return { data: null, error: courseResult.error || 'Course not found' }
    }

    const course = courseResult.data
    const courseId = course.id

    // Get weights and cut scores in parallel
    const [weightsResult, scoresResult] = await Promise.all([
      this.getCourseWeights(courseId),
      this.getLatestCutScores(courseId),
    ])

    // Group cut scores by modality (latest only)
    const latestScores = new Map<string, CutScore>()
    for (const score of scoresResult.data || []) {
      const key = getCutScoreIdentity(score)
      if (!latestScores.has(key)) {
        latestScores.set(key, score)
      }
    }

    return {
      data: {
        ...course,
        weights: weightsResult.data || [],
        cut_scores: Array.from(latestScores.values()),
      },
      error: null,
    }
  }

  /**
   * Get full course data with weights and cut scores
   */
  async getFullCourseData(code: number) {
    // Get course
    const courseResult = await this.getCourseByCode(code)
    if (!courseResult.data) {
      return { data: null, error: courseResult.error || 'Course not found' }
    }

    const course = courseResult.data
    const courseId = course.id

    // Get weights and cut scores in parallel
    const [weightsResult, scoresResult] = await Promise.all([
      this.getCourseWeights(courseId),
      this.getLatestCutScores(courseId),
    ])

    // Group cut scores by modality (latest only)
    const latestScores = new Map<string, CutScore>()
    for (const score of scoresResult.data || []) {
      const key = getCutScoreIdentity(score)
      if (!latestScores.has(key)) {
        latestScores.set(key, score)
      }
    }

    return {
      data: {
        ...course,
        weights: weightsResult.data || [],
        cut_scores: Array.from(latestScores.values()),
      },
      error: null,
    }
  }

  /**
   * Get approved students for a course
   */
  async getApprovedStudents(courseId: number, page = 1, limit = 50, year?: number) {
    const offset = (page - 1) * limit

    // If no year specified, first find the latest year with data
    if (!year) {
      const latestYearResult = await this.request<ApprovedStudent[]>(
        `approved_students?course_id=eq.${courseId}&select=year&order=year.desc&limit=1`
      )
      if (latestYearResult.data && latestYearResult.data.length > 0) {
        year = latestYearResult.data[0].year
      }
    }

    const params = new URLSearchParams({
      course_id: `eq.${courseId}`,
      order: 'rank.asc',
      limit: String(limit),
      offset: String(offset),
    })

    // Filter by year if we have one
    if (year) {
      params.set('year', `eq.${year}`)
    }

    return this.request<ApprovedStudent[]>(`approved_students?${params}`, {
      headers: { 'Prefer': 'count=exact' },
    })
  }
}

// Types
export interface Course {
  id: number
  code: number
  name: string
  university: string | null
  campus: string | null
  city: string | null
  state: string | null
  degree: string | null
  schedule: string | null
  latitude: string | null
  longitude: string | null
  created_at: string
}

export interface CourseWeights {
  id: number
  course_id: number
  year: number
  peso_red: number | null
  peso_ling: number | null
  peso_mat: number | null
  peso_ch: number | null
  peso_cn: number | null
  min_red: number | null
  min_ling: number | null
  min_mat: number | null
  min_ch: number | null
  min_cn: number | null
  min_enem: number | null
}

export interface CutScore {
  id: number
  course_id: number
  year: number
  modality_code: number | null
  modality_name: string
  cut_score: number | null
  applicants: number | null
  vacancies: number | null
  captured_at: string | null
  partial_scores?: Array<{ day: string | number; score: number }>
}

export interface FullCourseData extends Course {
  weights: CourseWeights[]
  cut_scores: CutScore[]
}

export interface ApprovedStudent {
  id: number
  course_id: number
  year: number
  modality_code: number
  rank: number
  name: string
  score: number
  bonus: number
  call_number: number
  status: string
}

// Export singleton instance
export const supabase = new SupabaseServer()
