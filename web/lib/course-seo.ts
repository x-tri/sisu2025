import { resolveUniversityAcronym } from '@/lib/institution-acronyms'
import type { CourseReference, CourseSearchItem } from '@/types/course'

/** Numeric identifier the SISU source emits for ampla concorrência. */
export const AMPLA_MODALITY_ID = '41'

type CourseIdentity = Pick<CourseSearchItem, 'code' | 'name' | 'university' | 'city' | 'state'>

type CourseOffer = Pick<CourseSearchItem, 'city' | 'state' | 'degree' | 'schedule'>

export interface UniversityGroup {
  slug: string
  name: string
  acronym: string | null
  states: string[]
  courses: CourseSearchItem[]
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Short institution label for titles and slugs: curated acronym, else the official name. */
export function institutionLabel(university: string | null): string | null {
  return resolveUniversityAcronym(university) ?? (university?.trim() || null)
}

export function courseSlug(course: CourseIdentity): string {
  const parts = [course.name, institutionLabel(course.university), course.city, course.state]
    .filter((part): part is string => Boolean(part?.trim()))
    .map(slugify)
    .filter(Boolean)
  return [String(course.code), ...parts].join('-')
}

/**
 * What tells one offer apart from another of the same course and institution:
 * "Cuiabá/MT, Bacharelado, Noturno". Parentheses inside the degree are flattened
 * so the result can itself sit inside parentheses.
 */
export function courseQualifiers(course: CourseOffer): string {
  const place = [course.city, course.state].filter(Boolean).join('/')
  const degree = course.degree?.replace(/\s*\(([^)]*)\)/g, ' – $1').trim()
  return [place, degree, course.schedule?.trim()].filter(Boolean).join(', ')
}

/** The SISU code is the leading number of the slug; the rest is descriptive only. */
export function parseCourseSlug(slug: string): number | null {
  const match = /^(\d{1,9})(?:-|$)/.exec(slug)
  if (!match) return null
  const code = Number(match[1])
  return code > 0 ? code : null
}

export function coursePath(course: CourseIdentity): string {
  return `/nota-de-corte/${courseSlug(course)}`
}

export function universitySlug(university: string): string {
  return slugify(university)
}

export function universityPath(university: string): string {
  return `/universidade/${universitySlug(university)}`
}

export function groupCoursesByUniversity(courses: CourseSearchItem[]): UniversityGroup[] {
  const groups = new Map<string, UniversityGroup>()

  for (const course of courses) {
    const name = course.university?.trim()
    if (!name) continue
    const slug = universitySlug(name)
    if (!slug) continue

    let group = groups.get(slug)
    if (!group) {
      group = { slug, name, acronym: resolveUniversityAcronym(name), states: [], courses: [] }
      groups.set(slug, group)
    }
    group.courses.push(course)
    if (course.state && !group.states.includes(course.state)) group.states.push(course.state)
  }

  const collator = new Intl.Collator('pt-BR')
  const result = Array.from(groups.values())
  for (const group of result) {
    group.states.sort(collator.compare)
    group.courses.sort((left, right) => (
      collator.compare(left.name, right.name)
      || collator.compare(left.city ?? '', right.city ?? '')
      || left.code - right.code
    ))
  }
  return result.sort((left, right) => collator.compare(left.name, right.name))
}

export function latestEdition(references: CourseReference[]): number | null {
  return references.reduce<number | null>(
    (latest, reference) => (latest === null || reference.edition > latest ? reference.edition : latest),
    null,
  )
}

/** True when the row carries a real cut-off, i.e. the table shows a number for it. */
export function hasRealCutoff(reference: CourseReference): boolean {
  return reference.cutoff !== null && reference.cutoff > 0
}

export function isAmplaReference(reference: CourseReference): boolean {
  return reference.modalityId === AMPLA_MODALITY_ID
}

/** References of one edition, ampla concorrência first, then by official name. */
export function referencesForEdition(references: CourseReference[], edition: number): CourseReference[] {
  return references
    .filter(reference => reference.edition === edition)
    .sort((left, right) => (
      Number(isAmplaReference(right)) - Number(isAmplaReference(left))
      || left.modalityOfficialName.localeCompare(right.modalityOfficialName, 'pt-BR')
    ))
}

/** Ampla concorrência cut-offs across editions, newest first; missing values are left out. */
export function amplaHistory(references: CourseReference[]): Array<{ edition: number; cutoff: number }> {
  return references
    .filter(isAmplaReference)
    .flatMap(reference => (
      reference.cutoff !== null && reference.cutoff > 0
        ? [{ edition: reference.edition, cutoff: reference.cutoff }]
        : []
    ))
    .sort((left, right) => right.edition - left.edition)
}

export function formatScore(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
    : 'Sem referência'
}

/** JSON for an inline ld+json script: "<" is escaped so no stored string can close the element. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
