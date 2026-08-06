import { getBrazilianStateName, resolveBrazilianStateCode } from './brazilian-states'
import {
  getInstitutionSearchAliases,
  resolveOfficialInstitutionNamesByAcronym,
} from './institution-acronyms'
import type { CourseSearchItem } from '../types/course'

interface IndexedCourse {
  course: CourseSearchItem
  name: string
  university: string
  city: string
  stateCode: string
  stateName: string
  aliases: string[]
  tokens: Set<string>
}

export interface CourseCatalogSearchResult {
  courses: CourseSearchItem[]
  total: number
}

const INDEX_BY_CATALOG = new WeakMap<CourseSearchItem[], IndexedCourse[]>()

export function normalizeCourseSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
}

function tokenize(value: string): string[] {
  return normalizeCourseSearch(value).split(' ').filter(Boolean)
}

function indexCatalog(courses: CourseSearchItem[]): IndexedCourse[] {
  const cached = INDEX_BY_CATALOG.get(courses)
  if (cached) return cached

  const indexed = courses.map(course => {
    const stateCode = normalizeCourseSearch(course.state || '')
    const stateName = normalizeCourseSearch(getBrazilianStateName(course.state) || '')
    const aliases = getInstitutionSearchAliases(course.university).map(normalizeCourseSearch)
    const searchableValues = [
      course.name,
      course.university || '',
      course.campus || '',
      course.city || '',
      course.state || '',
      getBrazilianStateName(course.state) || '',
      course.degree || '',
      course.schedule || '',
      ...aliases,
    ]
    const tokens = new Set(searchableValues.flatMap(tokenize))

    return {
      course,
      name: normalizeCourseSearch(course.name),
      university: normalizeCourseSearch(course.university || ''),
      city: normalizeCourseSearch(course.city || ''),
      stateCode,
      stateName,
      aliases,
      tokens,
    }
  })

  INDEX_BY_CATALOG.set(courses, indexed)
  return indexed
}

function tokenMatchesCourse(token: string, indexed: IndexedCourse): boolean {
  const isStateCode = Boolean(resolveBrazilianStateCode(token)) && token.length === 2
  const isInstitutionAlias = resolveOfficialInstitutionNamesByAcronym(token).length > 0

  if (isStateCode || isInstitutionAlias) return indexed.tokens.has(token)

  for (const candidate of Array.from(indexed.tokens)) {
    if (candidate.includes(token)) return true
  }
  return false
}

function getRelevance(indexed: IndexedCourse, query: string): number {
  if (indexed.name === query) return 0
  if (indexed.name.startsWith(query)) return 1
  if (indexed.aliases.includes(query)) return 2
  if (indexed.university === query) return 3
  if (indexed.university.startsWith(query)) return 4
  if (indexed.city === query) return 5
  if (indexed.stateCode === query || indexed.stateName === query) return 6
  if (indexed.name.includes(query)) return 7
  return 8
}

function compareIndexedCourses(left: IndexedCourse, right: IndexedCourse, query: string): number {
  const relevance = getRelevance(left, query) - getRelevance(right, query)
  if (relevance !== 0) return relevance

  const name = left.course.name.localeCompare(right.course.name, 'pt-BR', { sensitivity: 'base' })
  if (name !== 0) return name

  const university = (left.course.university || '').localeCompare(
    right.course.university || '',
    'pt-BR',
    { sensitivity: 'base' }
  )
  if (university !== 0) return university

  const city = (left.course.city || '').localeCompare(right.course.city || '', 'pt-BR', {
    sensitivity: 'base',
  })
  if (city !== 0) return city

  if (left.course.code !== right.course.code) return left.course.code - right.course.code
  return left.course.id - right.course.id
}

/**
 * Accent-insensitive catalog search across courses, institutions and geography.
 * Exact institution aliases and Brazilian states act as trusted facets; other
 * queries support partial terms and combinations such as "medicina UFMA".
 */
export function searchCourseCatalog(
  courses: CourseSearchItem[],
  rawQuery: string,
  limit: number,
  offset: number
): CourseCatalogSearchResult {
  const query = normalizeCourseSearch(rawQuery)
  if (!query) return { courses: [], total: 0 }

  const exactInstitutions = resolveOfficialInstitutionNamesByAcronym(rawQuery)
    .map(normalizeCourseSearch)
  const exactState = exactInstitutions.length > 0 ? null : resolveBrazilianStateCode(rawQuery)
  const queryTokens = tokenize(query)

  const matches = indexCatalog(courses).filter(indexed => {
    if (exactInstitutions.length > 0) return exactInstitutions.includes(indexed.university)
    if (exactState) return indexed.course.state?.toLocaleUpperCase('pt-BR') === exactState
    return queryTokens.every(token => tokenMatchesCourse(token, indexed))
  })

  matches.sort((left, right) => compareIndexedCourses(left, right, query))

  return {
    courses: matches.slice(offset, offset + limit).map(indexed => indexed.course),
    total: matches.length,
  }
}
