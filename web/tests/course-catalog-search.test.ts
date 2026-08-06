import assert from 'node:assert/strict'
import test from 'node:test'

import { searchCourseCatalog } from '../lib/course-catalog-search'
import type { CourseSearchItem } from '../types/course'

function makeCourse(
  id: number,
  name: string,
  university: string,
  city: string,
  state: string
): CourseSearchItem {
  return {
    id,
    code: 10_000 + id,
    name,
    university,
    campus: 'Campus',
    city,
    state,
    degree: 'Bacharelado',
    schedule: 'Integral',
  }
}

const CATALOG = [
  makeCourse(1, 'Medicina', 'Universidade Federal do Maranhão', 'São Luís', 'MA'),
  makeCourse(2, 'Administração', 'Universidade Federal do Maranhão', 'Imperatriz', 'MA'),
  makeCourse(3, 'Medicina', 'Universidade Federal do Rio Grande do Norte', 'Natal', 'RN'),
  makeCourse(4, 'Biomedicina', 'Universidade Federal de Pernambuco', 'Recife', 'PE'),
  makeCourse(5, 'Ciência da Computação', 'Universidade Federal de Minas Gerais', 'Belo Horizonte', 'MG'),
  makeCourse(6, 'Matemática', 'Universidade Federal do Rio Grande do Norte', 'Natal', 'RN'),
]

test('busca todas as ofertas de uma instituição por sigla', () => {
  for (const query of ['UFMA', 'ufma', ' UFMA ']) {
    const result = searchCourseCatalog(CATALOG, query, 30, 0)
    assert.equal(result.total, 2)
    assert.ok(result.courses.every(course => course.university === 'Universidade Federal do Maranhão'))
  }
})

test('busca estado por código ou nome sem confundir MA com Matemática', () => {
  for (const query of ['MA', 'Maranhão', 'maranhao']) {
    const result = searchCourseCatalog(CATALOG, query, 30, 0)
    assert.equal(result.total, 2)
    assert.ok(result.courses.every(course => course.state === 'MA'))
    assert.ok(result.courses.every(course => course.name !== 'Matemática'))
  }
})

test('busca cursos e cidades sem exigir acentos', () => {
  assert.deepEqual(
    searchCourseCatalog(CATALOG, 'sao luis', 30, 0).courses.map(course => course.id),
    [1]
  )
  assert.deepEqual(
    searchCourseCatalog(CATALOG, 'administracao', 30, 0).courses.map(course => course.id),
    [2]
  )
  assert.deepEqual(
    searchCourseCatalog(CATALOG, 'ciencia da computacao', 30, 0).courses.map(course => course.id),
    [5]
  )
})

test('aceita intenção combinada de curso e instituição', () => {
  const result = searchCourseCatalog(CATALOG, 'medicina UFMA', 30, 0)
  assert.equal(result.total, 1)
  assert.equal(result.courses[0]?.id, 1)
})

test('prioriza Medicina antes de Biomedicina', () => {
  const names = searchCourseCatalog(CATALOG, 'medicina', 30, 0).courses.map(course => course.name)
  assert.deepEqual(names, ['Medicina', 'Medicina', 'Biomedicina'])
})

test('pagina o catálogo completo sem lacunas ou duplicatas', () => {
  const catalog = Array.from({ length: 65 }, (_, index) => (
    makeCourse(index + 100, 'Medicina', 'Universidade Federal do Maranhão', 'São Luís', 'MA')
  ))
  const first = searchCourseCatalog(catalog, 'medicina', 30, 0)
  const second = searchCourseCatalog(catalog, 'medicina', 30, 30)
  const third = searchCourseCatalog(catalog, 'medicina', 30, 60)
  const ids = [...first.courses, ...second.courses, ...third.courses].map(course => course.id)

  assert.equal(first.total, 65)
  assert.equal(second.total, 65)
  assert.equal(third.total, 65)
  assert.equal(first.courses.length, 30)
  assert.equal(second.courses.length, 30)
  assert.equal(third.courses.length, 5)
  assert.equal(new Set(ids).size, 65)
})
