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

function mockCatalog(context: test.TestContext, data: CourseSearchItem[] | null, error: string | null = null) {
  context.mock.method(supabase, 'getCourseCatalog', async () => ({ data, error, count: data?.length }))
}

test('GET /api/filters envia cache público quando a lista tem itens', async context => {
  mockCatalog(context, [makeCourse(1, 'Belo Horizonte')])
  const response = await GET(new NextRequest('http://localhost/api/filters?type=states'))

  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control') ?? '', /public/)
})

test('GET /api/filters não cacheia lista vazia', async context => {
  mockCatalog(context, [makeCourse(1, 'Belo Horizonte')])
  const response = await GET(new NextRequest('http://localhost/api/filters?type=cities&state=ZZ'))

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), [])
  assert.doesNotMatch(response.headers.get('cache-control') ?? '', /public/)
})

test('GET /api/filters não usa cache público em 400', async () => {
  const response = await GET(new NextRequest('http://localhost/api/filters?type=cities'))

  assert.equal(response.status, 400)
  assert.doesNotMatch(response.headers.get('cache-control') ?? '', /public/)
})

test('GET /api/filters responde 502 com no-store quando o catálogo falha', async context => {
  context.mock.method(console, 'error', () => {})
  mockCatalog(context, null, 'down')
  const response = await GET(new NextRequest('http://localhost/api/filters?type=states'))

  assert.equal(response.status, 502)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})
