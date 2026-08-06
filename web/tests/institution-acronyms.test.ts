import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveOfficialInstitutionNameByAcronym,
  resolveUniversityAcronym,
} from '../lib/institution-acronyms'

test('resolve a sigla oficial da Universidade Federal do Rio Grande do Norte', () => {
  assert.equal(
    resolveUniversityAcronym('Universidade Federal do Rio Grande do Norte'),
    'UFRN'
  )
})

test('normaliza acentos, pontuação e espaços sem alterar a identidade institucional', () => {
  assert.equal(
    resolveUniversityAcronym('  Universidáde Federal do Rio,  Grande do Norte  '),
    'UFRN'
  )
})

test('não inventa sigla para uma instituição sem registro verificado', () => {
  assert.equal(resolveUniversityAcronym('Universidade Federal do Maranhão'), null)
  assert.equal(
    resolveUniversityAcronym('Instituto Federal de Educação, Ciência e Tecnologia do Rio Grande do Norte'),
    null
  )
  assert.equal(resolveUniversityAcronym(null), null)
})

test('regressão: nunca deriva UFRGN do nome oficial da UFRN', () => {
  assert.notEqual(
    resolveUniversityAcronym('Universidade Federal do Rio Grande do Norte'),
    'UFRGN'
  )
})

test('resolve UFRN para o nome oficial usado na busca', () => {
  assert.equal(
    resolveOfficialInstitutionNameByAcronym('ufrn'),
    'Universidade Federal do Rio Grande do Norte'
  )
  assert.equal(resolveOfficialInstitutionNameByAcronym('UFRGN'), null)
  assert.equal(resolveOfficialInstitutionNameByAcronym(null), null)
})
