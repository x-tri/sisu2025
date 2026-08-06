import assert from 'node:assert/strict'
import test from 'node:test'

import { NextRequest } from 'next/server'

import { GET } from '../app/api/filters/route'
import { supabase } from '../lib/supabase'
import type { CourseSearchItem } from '../types/course'

function makeCourse(id: number, city: string): CourseSearchItem {
  return {
    id,
    code: id,
    name: `Curso ${id}`,
    university: 'Universidade Federal de Minas Gerais',
    campus: 'Campus',
    city,
    state: 'MG',
    degree: 'Bacharelado',
    schedule: 'Integral',
  }
}

test('GET /api/filters retorna cidades além do limite de mil linhas', async context => {
  const catalog = Array.from({ length: 1_005 }, (_, index) => makeCourse(index + 1, `Cidade ${index + 1}`))
  context.mock.method(supabase, 'getCourseCatalog', async () => ({
    data: catalog,
    error: null,
    count: catalog.length,
  }))

  const response = await GET(new NextRequest('http://localhost/api/filters?type=cities&state=MG'))
  const cities = await response.json() as string[]

  assert.equal(response.status, 200)
  assert.equal(cities.length, 1_005)
  assert.equal(new Set(cities).size, 1_005)
})
