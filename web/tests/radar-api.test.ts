import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'

import { NextRequest } from 'next/server'

import { POST } from '../app/api/simulate/radar/route'
import { supabase } from '../lib/supabase'

const capturedAt = new Date().toISOString()

const equalWeights = {
  year: 2026,
  peso_red: 1,
  peso_ling: 1,
  peso_mat: 1,
  peso_ch: 1,
  peso_cn: 1,
}

const referenceCourse = {
  id: 1001,
  code: 12345,
  name: 'Medicina',
  university: 'UFGD',
  campus: 'Dourados',
  city: 'Dourados',
  state: 'MS',
  degree: 'Bacharelado',
  schedule: 'Integral',
  latitude: -22.223,
  longitude: -54.812,
  course_weights: [equalWeights],
  cut_scores: [{
    year: 2026,
    modality_name: 'Ampla concorrência',
    modality_code: 41,
    cut_score: 700,
    vacancies: 20,
    partial_scores: [],
    captured_at: capturedAt,
  }],
}

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: 2002,
    code: 67890,
    name: 'Medicina',
    university: 'UFMS',
    campus: 'Campo Grande',
    city: 'Campo Grande',
    state: 'MS',
    degree: 'Bacharelado',
    schedule: 'Integral',
    latitude: -20.469,
    longitude: -54.620,
    course_weights: [equalWeights],
    cut_scores: [{
      year: 2026,
      modality_name: 'Ampla concorrência',
      modality_code: 41,
      cut_score: 690,
      vacancies: 18,
      partial_scores: [],
      captured_at: capturedAt,
    }],
    ...overrides,
  }
}

function radarRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/simulate/radar', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      courseName: 'Medicina',
      modalityCode: 41,
      referenceCourseId: 1001,
      ...body,
    }),
  })
}

function mockCourses(
  context: TestContext,
  candidates: Array<ReturnType<typeof candidate>>,
) {
  context.mock.method(supabase, 'request', async (endpoint: string) => ({
    data: endpoint.includes('id=eq.1001') ? [referenceCourse] : candidates,
    error: null,
  }))
}

test('Radar calcula margem com corte existente mesmo quando a referência está unverified', async context => {
  mockCourses(context, [candidate()])

  const response = await POST(radarRequest({
    grades: {
      redacao: 700,
      linguagens: 700,
      humanas: 700,
      natureza: 700,
      matematica: 700,
    },
  }))
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.reference.verification, 'unverified')
  assert.deepEqual(body.comparison, { available: true })
  assert.equal(body.mode, 'comparison')
  assert.equal(body.results.length, 1)
  assert.equal(body.results[0].cutScore, 690)
  assert.equal(body.results[0].difference, 10)
  assert.equal(body.results[0].comparisonAvailable, true)
})

test('Radar discovery devolve corte e metadados sem calcular margem quando faltam notas', async context => {
  mockCourses(context, [candidate()])

  const response = await POST(radarRequest({ discoveryOnly: true }))
  const body = await response.json()
  const result = body.results[0]

  assert.equal(response.status, 200)
  assert.equal(body.mode, 'discovery')
  assert.deepEqual(body.comparison, { available: false, reason: 'GRADES_MISSING' })
  assert.equal(result.cutScore, 690)
  assert.equal(result.cutScoreYear, 2026)
  assert.equal(result.cutScoreType, 'final')
  assert.equal(result.partialDay, null)
  assert.equal(result.capturedAt, capturedAt)
  assert.equal(result.vacancies, 18)
  assert.equal(typeof result.distance, 'number')
  assert.equal(result.difference, undefined)
  assert.equal(result.comparisonAvailable, false)
})

test('Radar mantém pesos da mesma edição e estágio de corte compatível', async context => {
  const wrongWeights = candidate({
    id: 2003,
    course_weights: [{ ...equalWeights, year: 2025 }],
  })
  const partialStage = candidate({
    id: 2004,
    cut_scores: [{
      year: 2026,
      modality_name: 'Ampla concorrência',
      modality_code: 41,
      cut_score: null,
      vacancies: 10,
      partial_scores: [{ day: 4, score: 680 }],
      captured_at: capturedAt,
    }],
  })
  mockCourses(context, [candidate(), wrongWeights, partialStage])

  const response = await POST(radarRequest({
    grades: {
      redacao: 700,
      linguagens: 700,
      humanas: 700,
      natureza: 700,
      matematica: 700,
    },
  }))
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(body.results.map((result: { courseId: number }) => result.courseId), [2002])
})
