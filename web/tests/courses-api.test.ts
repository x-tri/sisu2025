import assert from 'node:assert/strict'
import test from 'node:test'

import { NextRequest } from 'next/server'

import { GET } from '../app/api/courses/route'
import { supabase } from '../lib/supabase'
import type { CourseSearchItem, CourseSearchResponse } from '../types/course'

const UFRN_COURSE: CourseSearchItem = {
  id: 2076,
  code: 685,
  name: 'Medicina',
  university: 'Universidade Federal do Rio Grande do Norte',
  campus: 'Centro de Ciências da Saúde',
  city: 'Natal',
  state: 'RN',
  degree: 'Bacharelado',
  schedule: 'Integral',
}

const UFMA_COURSE: CourseSearchItem = {
  ...UFRN_COURSE,
  id: 9999,
  code: 9999,
  university: 'Universidade Federal do Maranhão',
  city: 'São Luís',
  state: 'MA',
}

const BIOMEDICINE_COURSE: CourseSearchItem = {
  ...UFRN_COURSE,
  id: 3000,
  code: 3000,
  name: 'Biomedicina',
  university: 'Universidade Federal de Pernambuco',
  city: 'Recife',
  state: 'PE',
}

test('busca ranqueada prioriza nomes iniciados pelo termo antes de Biomedicina', async context => {
  const endpoints: string[] = []
  context.mock.method(supabase, 'request', async (endpoint: string) => {
    endpoints.push(endpoint)
    const params = new URLSearchParams(endpoint.split('?')[1])
    const nameFilters = params.getAll('name')

    if (nameFilters.includes('ilike.medicina*')) {
      return { data: [UFRN_COURSE], error: null, count: 73 }
    }

    assert.ok(nameFilters.includes('not.ilike.medicina*'))
    return { data: [BIOMEDICINE_COURSE], error: null, count: 112 }
  })

  const result = await supabase.searchCoursesRankedPaginated({ query: 'medicina' }, 2, 0)

  assert.equal(result.error, null)
  assert.equal(result.count, 185)
  assert.deepEqual(result.data?.map(course => course.name), ['Medicina', 'Biomedicina'])
  assert.equal(endpoints.length, 2)
})

test('catálogo inicial coloca Medicina primeiro sem quebrar a paginação', async context => {
  context.mock.method(supabase, 'request', async (endpoint: string) => {
    const params = new URLSearchParams(endpoint.split('?')[1])
    const offset = Number(params.get('offset'))

    if (params.get('name') === 'eq.Medicina') {
      return { data: offset === 0 ? [UFRN_COURSE] : [], error: null, count: 1 }
    }

    assert.equal(params.get('name'), 'not.eq.Medicina')
    assert.equal(offset, 0)
    return { data: [BIOMEDICINE_COURSE], error: null, count: 1 }
  })

  const firstPage = await supabase.getCourses(2, 0)
  assert.equal(firstPage.error, null)
  assert.equal(firstPage.count, 2)
  assert.deepEqual(firstPage.data?.map(course => course.name), ['Medicina', 'Biomedicina'])

  const secondPage = await supabase.getCourses(1, 1)
  assert.equal(secondPage.error, null)
  assert.equal(secondPage.count, 2)
  assert.deepEqual(secondPage.data?.map(course => course.name), ['Biomedicina'])
})

test('GET /api/courses expõe siglas do catálogo institucional', async context => {
  context.mock.method(supabase, 'searchCoursesPaginated', async () => ({
    data: [UFRN_COURSE, UFMA_COURSE],
    error: null,
    count: 2,
  }))
  context.mock.method(supabase, 'getCoursePreviewCutScores', async () => ({
    data: [],
    error: null,
  }))
  context.mock.method(supabase, 'getCoursePreviewWeights', async () => ({
    data: [],
    error: null,
  }))

  const request = new NextRequest(
    'http://localhost/api/courses?institution=Universidade%20Federal&limit=10'
  )
  const response = await GET(request)
  const body = await response.json() as CourseSearchResponse

  assert.equal(response.status, 200)
  assert.equal(body.courses[0]?.universityAcronym, 'UFRN')
  assert.notEqual(body.courses[0]?.universityAcronym, 'UFRGN')
  assert.equal(body.courses[1]?.universityAcronym, 'UFMA')
})

test('GET /api/courses devolve os pesos por área para calcular a nota do visitante', async context => {
  context.mock.method(supabase, 'searchCoursesPaginated', async () => ({
    data: [UFRN_COURSE],
    error: null,
    count: 1,
  }))
  context.mock.method(supabase, 'getCoursePreviewCutScores', async () => ({
    data: [{
      course_id: UFRN_COURSE.id,
      year: 2026,
      modality_id: 41,
      cut_score: 794.37,
      captured_at: '2026-11-15T00:00:00.000Z',
    }],
    error: null,
  }))
  context.mock.method(supabase, 'getCoursePreviewWeights', async () => ({
    data: [{
      course_id: UFRN_COURSE.id,
      year: 2026,
      peso_red: 1.5,
      peso_ling: 1.5,
      peso_ch: 1.5,
      peso_cn: 3,
      peso_mat: 1,
    }],
    error: null,
  }))

  const request = new NextRequest(
    'http://localhost/api/courses?institution=Universidade%20Federal&limit=10'
  )
  const response = await GET(request)
  const body = await response.json() as CourseSearchResponse

  assert.equal(response.status, 200)
  assert.deepEqual(body.courses[0]?.weights, {
    peso_red: 1.5,
    peso_ling: 1.5,
    peso_ch: 1.5,
    peso_cn: 3,
    peso_mat: 1,
  })
})

test('GET /api/courses encontra ofertas ao buscar pela sigla UFMA', async context => {
  context.mock.method(supabase, 'searchCourseCatalog', async (query: string) => {
    assert.equal(query, 'UFMA')
    return {
      data: [UFMA_COURSE],
      error: null,
      count: 1,
    }
  })
  context.mock.method(supabase, 'getCoursePreviewCutScores', async () => ({
    data: [],
    error: null,
  }))
  context.mock.method(supabase, 'getCoursePreviewWeights', async () => ({
    data: [],
    error: null,
  }))

  const request = new NextRequest('http://localhost/api/courses?q=UFMA&limit=30')
  const response = await GET(request)
  const body = await response.json() as CourseSearchResponse

  assert.equal(response.status, 200)
  assert.equal(body.query, 'UFMA')
  assert.equal(body.total, 1)
  assert.equal(body.courses[0]?.universityAcronym, 'UFMA')
  assert.equal(body.courses[0]?.university, 'Universidade Federal do Maranhão')
})
