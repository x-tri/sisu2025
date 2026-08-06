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
