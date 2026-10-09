import assert from 'node:assert/strict'
import test from 'node:test'

import {
  amplaHistory,
  coursePath,
  courseSlug,
  formatScore,
  groupCoursesByUniversity,
  latestEdition,
  parseCourseSlug,
  referencesForEdition,
  slugify,
} from '../lib/course-seo'
import type { CourseReference, CourseSearchItem } from '../types/course'

function course(overrides: Partial<CourseSearchItem> = {}): CourseSearchItem {
  return {
    id: 1,
    code: 8218,
    name: 'ABI - Ciências Sociais',
    university: 'Universidade Federal de São Paulo',
    campus: 'Campus Guarulhos',
    city: 'Guarulhos',
    state: 'SP',
    degree: 'Área Básica de Ingresso (ABI)',
    schedule: 'Noturno',
    ...overrides,
  }
}

function reference(overrides: Partial<CourseReference> = {}): CourseReference {
  return {
    courseCode: 8218,
    edition: 2026,
    modalityId: '41',
    modalityOfficialName: 'Ampla concorrência',
    cutoff: 715.58,
    referenceType: 'historical',
    partialScores: [],
    capturedAt: null,
    weightsEdition: 2026,
    minimums: null,
    sourceUrl: 'https://sisu.mec.gov.br/vagas',
    verification: { status: 'unverified' },
    ...overrides,
  }
}

test('slugify removes accents and punctuation', () => {
  assert.equal(slugify('ABI - Ciências Sociais'), 'abi-ciencias-sociais')
  assert.equal(slugify("Santa Bárbara d'Oeste"), 'santa-barbara-d-oeste')
})

test('course slug starts with the SISU code and uses the curated acronym', () => {
  assert.equal(courseSlug(course()), '8218-abi-ciencias-sociais-unifesp-guarulhos-sp')
  assert.equal(coursePath(course()), '/nota-de-corte/8218-abi-ciencias-sociais-unifesp-guarulhos-sp')
})

test('course slug falls back to the official name and skips missing parts', () => {
  assert.equal(
    courseSlug(course({ university: 'Instituição Sem Sigla', city: null, state: null })),
    '8218-abi-ciencias-sociais-instituicao-sem-sigla',
  )
})

test('parseCourseSlug reads only the leading code', () => {
  assert.equal(parseCourseSlug('8218-abi-ciencias-sociais-unifesp-guarulhos-sp'), 8218)
  assert.equal(parseCourseSlug('8218'), 8218)
  assert.equal(parseCourseSlug('medicina-8218'), null)
  assert.equal(parseCourseSlug('0-curso'), null)
  assert.equal(parseCourseSlug('8218abc'), null)
})

test('groupCoursesByUniversity groups, sorts and ignores courses without institution', () => {
  const groups = groupCoursesByUniversity([
    course({ id: 2, code: 2, name: 'Medicina', city: 'São Paulo' }),
    course({ id: 1, code: 1, name: 'Direito', city: 'Osasco' }),
    course({ id: 3, code: 3, name: 'Física', university: 'Universidade Federal do Rio Grande do Norte', city: 'Natal', state: 'RN' }),
    course({ id: 4, code: 4, university: null }),
  ])

  assert.deepEqual(groups.map(group => group.acronym), ['UNIFESP', 'UFRN'])
  assert.deepEqual(groups[0].courses.map(item => item.name), ['Direito', 'Medicina'])
  assert.deepEqual(groups[1].states, ['RN'])
  assert.equal(groups[0].slug, 'universidade-federal-de-sao-paulo')
})

test('referencesForEdition puts ampla concorrência first', () => {
  const references = [
    reference({ modalityId: '687', modalityOfficialName: 'Candidatos de escola pública' }),
    reference(),
    reference({ edition: 2025, cutoff: 710.85 }),
  ]

  assert.equal(latestEdition(references), 2026)
  assert.deepEqual(
    referencesForEdition(references, 2026).map(item => item.modalityId),
    ['41', '687'],
  )
})

test('amplaHistory lists editions newest first and drops missing cut-offs', () => {
  const references = [
    reference({ edition: 2024, cutoff: 711.55 }),
    reference({ edition: 2026 }),
    reference({ edition: 2023, cutoff: null }),
    reference({ edition: 2022, cutoff: 0 }),
    reference({ edition: 2026, modalityId: '687', cutoff: 705.67 }),
  ]

  assert.deepEqual(amplaHistory(references), [
    { edition: 2026, cutoff: 715.58 },
    { edition: 2024, cutoff: 711.55 },
  ])
})

test('formatScore never shows an absent cut-off as a number', () => {
  assert.equal(formatScore(715.58), '715,58')
  assert.equal(formatScore(null), 'Sem referência')
  assert.equal(formatScore(0), 'Sem referência')
})
