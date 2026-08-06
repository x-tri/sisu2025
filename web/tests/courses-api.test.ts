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

const UNKNOWN_INSTITUTION_COURSE: CourseSearchItem = {
  ...UFRN_COURSE,
  id: 9999,
  code: 9999,
  university: 'Universidade Federal do Maranhão',
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

test('GET /api/courses expõe somente siglas do registro institucional verificado', async context => {
  context.mock.method(supabase, 'searchCoursesPaginated', async () => ({
    data: [UFRN_COURSE, UNKNOWN_INSTITUTION_COURSE],
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
  assert.equal(body.courses[1]?.universityAcronym, null)
})

test('GET /api/courses encontra ofertas ao buscar pela sigla UFRN', async context => {
  context.mock.method(supabase, 'searchCoursesPaginated', async filters => {
    assert.equal(filters.query, undefined)
    assert.equal(filters.institution, 'Universidade Federal do Rio Grande do Norte')
    return {
      data: [UFRN_COURSE],
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

  const request = new NextRequest('http://localhost/api/courses?q=UFRN&limit=30')
  const response = await GET(request)
  const body = await response.json() as CourseSearchResponse

  assert.equal(response.status, 200)
  assert.equal(body.query, 'UFRN')
  assert.equal(body.total, 1)
  assert.equal(body.courses[0]?.universityAcronym, 'UFRN')
  assert.equal(body.courses[0]?.university, 'Universidade Federal do Rio Grande do Norte')
})
