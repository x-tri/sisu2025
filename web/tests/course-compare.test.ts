import assert from 'node:assert/strict'
import test from 'node:test'

import {
  closestPassing,
  courseCutoff,
  courseMakesIt,
  courseWeightedScore,
  passableCourses,
  type ClosestCourseComparison,
} from '../lib/course-compare'
import type { CourseSearchItem, CourseReference } from '../types/course'
import type { Scores } from '../lib/score-core'

const WEIGHTS = { peso_red: 1, peso_ling: 1.5, peso_ch: 1.5, peso_cn: 3, peso_mat: 1 }

function reference(cutoff: number): CourseReference {
  return {
    courseCode: 0,
    edition: 2026,
    modalityId: '41',
    modalityOfficialName: 'Ampla concorrência',
    cutoff,
    referenceType: 'final',
    partialScores: [],
    capturedAt: null,
    weightsEdition: 2026,
    minimums: null,
    sourceUrl: 'https://sisu.mec.gov.br',
    verification: { status: 'verified' },
  }
}

function offer(id: number, code: number, name: string, cutoff: number | null): CourseSearchItem {
  return {
    id,
    code,
    name,
    university: 'Universidade Federal do Rio Grande do Norte',
    campus: 'Natal',
    city: 'Natal',
    state: 'RN',
    degree: 'Bacharelado',
    schedule: 'Integral',
    weights: WEIGHTS,
    reference: cutoff === null ? null : reference(cutoff),
  }
}

const SCORES: Scores = {
  redacao: 800,
  linguagens: 700,
  humanas: 700,
  natureza: 700,
  matematica: 700,
}

test('courseCutoff usa o cutoff canônico e ignora corte zero', () => {
  assert.equal(courseCutoff(offer(1, 1, 'Medicina', 794.37)), 794.37)
  assert.equal(courseCutoff(offer(2, 2, 'Medicina', null)), null)

  const zero = offer(3, 3, 'Medicina', 0)
  assert.equal(courseCutoff(zero), null)
})

test('courseWeightedScore devolve null sem notas ou sem pesos', () => {
  const noWeights = { ...offer(4, 4, 'Medicina', 700), weights: null }
  assert.equal(courseWeightedScore(null, offer(1, 1, 'Medicina', 700)), null)
  assert.equal(courseWeightedScore(SCORES, noWeights), null)
  assert.equal(typeof courseWeightedScore(SCORES, offer(1, 1, 'Medicina', 700)), 'number')
})

test('courseMakesIt distingue passar, não passar e não avaliável', () => {
  // 713,33 ponderado vs corte 700 -> passa
  assert.equal(courseMakesIt(SCORES, offer(1, 1, 'Medicina', 700)), true)
  // corte 760 -> não passa
  assert.equal(courseMakesIt(SCORES, offer(2, 2, 'Medicina', 760)), false)
  // sem referência -> não avaliável
  assert.equal(courseMakesIt(SCORES, offer(3, 3, 'Medicina', null)), null)
  // sem notas -> não avaliável
  assert.equal(courseMakesIt(null, offer(1, 1, 'Medicina', 700)), null)
})

test('passableCourses filtra apenas onde passa', () => {
  const list = [
    offer(1, 1, 'Medicina', 700), // passa
    offer(2, 2, 'Medicina', 760), // não passa
    offer(3, 3, 'Medicina', null), // sem referência
  ]
  const passed = passableCourses(list, SCORES)
  assert.equal(passed.length, 1)
  assert.equal(passed[0].code, 1)
})

test('closestPassing ordena pela menor distância e limita', () => {
  const list = [
    offer(10, 10, 'Longe', 500), // distância ~213 -> último
    offer(20, 20, 'Perto', 712), // distância ~1.33 -> primeiro
    offer(30, 30, 'Meio', 680), // distância ~33
    offer(40, 40, 'Sem ref', null),
  ]
  const result: ClosestCourseComparison[] = closestPassing(list, SCORES, 5)
  assert.equal(result.length, 3)
  assert.deepEqual(result.map(item => item.course.code), [20, 30, 10])
  assert.equal(result[0].relation, 'above')
  assert.equal(result[0].weighted, 712.5)
})

test('closestPassing respeita o limite e deduplica por id', () => {
  const list = [
    offer(1, 1, 'A', 600),
    offer(2, 2, 'B', 610),
    offer(3, 3, 'C', 620),
  ]
  const result = closestPassing(list, SCORES, 2)
  assert.equal(result.length, 2)
  assert.deepEqual(result.map(item => item.course.code), [3, 2])

  const dup = [offer(1, 1, 'A', 600), { ...offer(1, 1, 'A', 600), code: 99 }]
  assert.equal(closestPassing(dup, SCORES, 5).length, 1)
})

test('closestPassing devolve lista vazia sem scores', () => {
  assert.deepEqual(closestPassing([offer(1, 1, 'A', 600)], null, 5), [])
})