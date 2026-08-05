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
    return this.searchCoursesPaginated({ query }, limit, 0)
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

    return this.request<CourseSearchItem[]>(`courses?${params}`, {
      headers: { 'Prefer': 'count=exact' },
    })
  }

  /**
   * Get all courses (paginated)
   */
  async getCourses(limit = 50, offset = 0) {
    const params = new URLSearchParams({
      order: 'name',
      limit: String(limit),
      offset: String(offset),
    })

    return this.request<Course[]>(`courses?${params}`, {
      headers: { 'Prefer': 'count=exact' },
    })
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
   * Fetch all course geography fields in API-sized batches. The exact total in
   * Content-Range is also used by the coverage endpoint.
   */
  async getCourseCoverageRows(batchSize = 1000) {
    const getBatch = (offset: number, withCount = false) => {
      const params = new URLSearchParams({
        select: 'id,state,city,university',
        order: 'id.asc',
        limit: String(batchSize),
        offset: String(offset),
      })

      return this.request<CourseCoverageRow[]>(`courses?${params}`, withCount
        ? { headers: { 'Prefer': 'count=exact' } }
        : {})
    }

    const firstBatch = await getBatch(0, true)
    if (firstBatch.error || !firstBatch.data) {
      return firstBatch
    }

    const total = firstBatch.count ?? firstBatch.data.length
    const offsets: number[] = []
    for (let offset = batchSize; offset < total; offset += batchSize) {
      offsets.push(offset)
    }

    const remainingBatches = await Promise.all(offsets.map(offset => getBatch(offset)))
    const failedBatch = remainingBatches.find(batch => batch.error || !batch.data)
    if (failedBatch) {
      return {
        data: null,
        error: failedBatch.error || 'Incomplete course coverage response',
        count: total,
      }
    }

    return {
      data: [
        ...firstBatch.data,
        ...remainingBatches.flatMap(batch => batch.data || []),
      ],
      error: null,
      count: total,
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
