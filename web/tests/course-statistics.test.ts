import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'

import { GET as getCourseStatistics } from '../app/api/courses/[code]/statistics/route'
import {
  buildCourseStatistics,
  getModalityFamily,
  resolveStatisticsModality,
  type ApprovedScoreRow,
} from '../lib/course-statistics'
import { supabase, type Course, type CutScore } from '../lib/supabase'

const PPI_LOW_INCOME_2025 = 'Candidatos autodeclarados pretos, pardos ou indígenas, com renda familiar bruta per capita igual ou inferior a 1 salário mínimo e que tenham cursado integralmente o ensino médio em escolas públicas.'
const PPI_LOW_INCOME_2024 = 'Candidatos autodeclarados pretos, pardos ou indígenas, com renda familiar bruta per capita igual ou inferior a 1 salário mínimo e que tenham cursado integralmente o ensino médio em escolas públicas.'
const PPI_LOW_INCOME_OLD = 'Candidatos autodeclarados pretos, pardos ou indígenas, com renda familiar bruta per capita igual ou inferior a 1,5 salário mínimo e que tenham cursado integralmente o ensino médio em escolas públicas.'

function cut(overrides: Partial<CutScore>): CutScore {
  return {
    id: 1,
    course_id: 9636,
    year: 2026,
    modality_code: 682,
    modality_name: PPI_LOW_INCOME_2025,
    cut_score: null,
    applicants: null,
    vacancies: null,
    captured_at: '2026-01-20T17:12:39.000Z',
    partial_scores: [],
    ...overrides,
  }
}

test('reconhece famílias históricas sem transformar desconhecida em Ampla', () => {
  assert.equal(getModalityFamily('Ampla concorrência'), 'broad-competition')
  assert.equal(getModalityFamily(PPI_LOW_INCOME_2025), 'public-school-low-income-ppi')
  assert.equal(getModalityFamily(PPI_LOW_INCOME_OLD), 'public-school-low-income-ppi')
  assert.equal(
    getModalityFamily('Candidatos autodeclarados quilombolas, com renda familiar bruta per capita igual ou inferior a 1 salário mínimo e que tenham cursado integralmente o ensino médio em escolas públicas.'),
    'public-school-low-income-quilombola',
  )
  assert.equal(getModalityFamily('Ação afirmativa própria da instituição'), 'unknown')
})

test('resolve códigos equivalentes por família e mantém desconhecidos no id exato', () => {
  const scores = [
    cut({ id: 1, year: 2023, modality_code: 221, modality_name: PPI_LOW_INCOME_OLD }),
    cut({ id: 2, year: 2024, modality_code: 608, modality_name: PPI_LOW_INCOME_2024 }),
    cut({ id: 3, year: 2025, modality_code: 682 }),
    cut({ id: 4, year: 2025, modality_code: 41, modality_name: 'Ampla concorrência' }),
  ]

  const resolved = resolveStatisticsModality(scores, '682')
  assert.ok(resolved)
  assert.deepEqual(
    Array.from(resolved.compatibleModalityCodes).sort((left, right) => left - right),
    [221, 608, 682],
  )
  assert.equal(resolved.rows.some(row => row.modality_code === 41), false)

  const unknownScores = [
    cut({ id: 5, modality_code: 900, modality_name: 'Ação afirmativa própria' }),
    cut({ id: 6, modality_code: 901, modality_name: 'Outra ação afirmativa própria' }),
  ]
  const unknown = resolveStatisticsModality(unknownScores, '900')
  assert.ok(unknown)
  assert.deepEqual(Array.from(unknown.compatibleModalityCodes), [900])
})

test('monta séries, usa a última parcial quando o corte falta e agrega sem nomes', () => {
  const scores = [
    cut({
      id: 1,
      year: 2024,
      modality_code: 608,
      modality_name: PPI_LOW_INCOME_2024,
      cut_score: 650.25,
      applicants: 120,
      vacancies: 8,
      partial_scores: [
        { day: '2', score: 648 },
        { day: '1', score: 640 },
      ],
    }),
    cut({
      id: 2,
      year: 2025,
      modality_code: 682,
      cut_score: null,
      applicants: null,
      vacancies: 9,
      partial_scores: [
        { day: 4, score: 660.5 },
        { day: 1, score: 645 },
        { day: 3, score: 658 },
      ],
    }),
    cut({
      id: 3,
      year: 2025,
      modality_code: 41,
      modality_name: 'Ampla concorrência',
      cut_score: 800,
    }),
  ]
  const students: ApprovedScoreRow[] = [
    { year: 2024, modality_code: 608, call_number: 1, score: 700 },
    { year: 2024, modality_code: 608, call_number: 1, score: 720 },
    { year: 2024, modality_code: 608, call_number: 1, score: 710 },
    { year: 2025, modality_code: 682, call_number: 1, score: 730 },
    { year: 2025, modality_code: 41, call_number: 1, score: 900 },
  ]

  const result = buildCourseStatistics(
    2507,
    '682',
    scores,
    students,
    new Date('2026-08-06T02:00:00.000Z'),
  )
  assert.ok(result)
  assert.equal(result.modality.id, '682')
  assert.equal(result.modality.family, 'public-school-low-income-ppi')
  assert.deepEqual(result.partialSeries[1], {
    edition: 2025,
    semester: null,
    points: [
      { day: 1, score: 645 },
      { day: 3, score: 658 },
      { day: 4, score: 660.5 },
    ],
  })
  assert.deepEqual(result.cutoffHistory.map(item => ({
    edition: item.edition,
    cutoff: item.cutoff,
    effectiveCutoff: item.effectiveCutoff,
    referenceType: item.referenceType,
    partialDay: item.partialDay,
  })), [
    {
      edition: 2024,
      cutoff: 650.25,
      effectiveCutoff: 650.25,
      referenceType: 'final',
      partialDay: null,
    },
    {
      edition: 2025,
      cutoff: null,
      effectiveCutoff: 660.5,
      referenceType: 'partial',
      partialDay: 4,
    },
  ])
  assert.deepEqual(result.approvedScoreSummary, [
    {
      edition: 2024,
      semester: 1,
      admissionCall: 1,
      count: 3,
      mean: 710,
      median: 710,
      min: 700,
      max: 720,
    },
    {
      edition: 2025,
      semester: 1,
      admissionCall: 1,
      count: 1,
      mean: 730,
      median: 730,
      min: 730,
      max: 730,
    },
  ])
  assert.deepEqual(result.approvedAreaAverages, [])
})

test('não produz contrato quando o id solicitado não existe', () => {
  assert.equal(buildCourseStatistics(2507, '682', [
    cut({ modality_code: 41, modality_name: 'Ampla concorrência' }),
  ], []), null)
})

test('rota seleciona somente campos não nominais e preserva o erro sem fallback', async () => {
  const originalGetCourseByCode = supabase.getCourseByCode
  const originalGetLatestCutScores = supabase.getLatestCutScores
  const originalRequest = supabase.request
  const requestedEndpoints: string[] = []

  const course: Course = {
    id: 9636,
    code: 2507,
    name: 'Biomedicina',
    university: 'Universidade Federal do Rio Grande do Norte',
    campus: 'Campus de Natal',
    city: 'Natal',
    state: 'RN',
    degree: 'Bacharelado',
    schedule: 'Integral',
    latitude: null,
    longitude: null,
    created_at: '2026-01-01T00:00:00.000Z',
  }
  const scores = [cut({
    modality_code: 682,
    cut_score: 650,
    applicants: 100,
    vacancies: 10,
  })]
  const students: ApprovedScoreRow[] = [
    { year: 2026, modality_code: 682, call_number: 1, score: 700 },
  ]

  try {
    supabase.getCourseByCode = async () => ({ data: course, error: null })
    supabase.getLatestCutScores = async () => ({ data: scores, error: null })
    supabase.request = (async (endpoint: string) => {
      requestedEndpoints.push(endpoint)
      return { data: students, error: null }
    }) as typeof supabase.request

    const response = await getCourseStatistics(
      new NextRequest('http://localhost/api/courses/2507/statistics?modalityId=682'),
      { params: Promise.resolve({ code: '2507' }) },
    )
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.modality.id, '682')
    assert.deepEqual(body.approvedScoreSummary, [{
      edition: 2026,
      semester: 1,
      admissionCall: 1,
      count: 1,
      mean: 700,
      median: 700,
      min: 700,
      max: 700,
    }])
    assert.equal(requestedEndpoints.length, 1)
    assert.match(requestedEndpoints[0], /select=year%2Cmodality_code%2Cscore%2Ccall_number/)
    assert.doesNotMatch(requestedEndpoints[0], /(?:^|[?,])name(?:[=,&]|$)/)

    requestedEndpoints.length = 0
    const missing = await getCourseStatistics(
      new NextRequest('http://localhost/api/courses/2507/statistics?modalityId=41'),
      { params: Promise.resolve({ code: '2507' }) },
    )
    assert.equal(missing.status, 404)
    assert.equal((await missing.json()).code, 'NO_REFERENCE_FOR_MODALITY')
    assert.equal(requestedEndpoints.length, 0)
  } finally {
    supabase.getCourseByCode = originalGetCourseByCode
    supabase.getLatestCutScores = originalGetLatestCutScores
    supabase.request = originalRequest
  }
})
