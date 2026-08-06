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

test('resolve instituições federais de diferentes regiões', () => {
  assert.equal(resolveUniversityAcronym('Universidade Federal do Maranhão'), 'UFMA')
  assert.equal(resolveUniversityAcronym('Universidade Federal de Minas Gerais'), 'UFMG')
  assert.equal(resolveUniversityAcronym('Universidade Federal de Pernambuco'), 'UFPE')
  assert.equal(
    resolveUniversityAcronym('Instituto Federal de Educação, Ciência e Tecnologia do Rio Grande do Norte'),
    'IFRN'
  )
  assert.equal(resolveUniversityAcronym('Universidade Imaginária'), null)
  assert.equal(resolveUniversityAcronym(null), null)
})

test('regressão: nunca deriva UFRGN do nome oficial da UFRN', () => {
  assert.notEqual(
    resolveUniversityAcronym('Universidade Federal do Rio Grande do Norte'),
    'UFRGN'
  )
})

test('resolve siglas para os nomes oficiais usados na busca', () => {
  assert.equal(
    resolveOfficialInstitutionNameByAcronym('ufrn'),
    'Universidade Federal do Rio Grande do Norte'
  )
  assert.equal(
    resolveOfficialInstitutionNameByAcronym('UFMA'),
    'Universidade Federal do Maranhão'
  )
  assert.equal(
    resolveOfficialInstitutionNameByAcronym('unifal'),
    'Universidade Federal de Alfenas'
  )
  assert.equal(resolveOfficialInstitutionNameByAcronym('UFRGN'), null)
  assert.equal(resolveOfficialInstitutionNameByAcronym(null), null)
})

test('cobre todas as 65 universidades federais presentes no catálogo', () => {
  const aliases = [
    'UFGD', 'UFCSPA', 'UFABC', 'UNIPAMPA', 'UFT', 'UNIVASF', 'UFF', 'UFRA',
    'UFRPE', 'UFRRJ', 'UFERSA', 'UFBA', 'UFFS', 'UNILA', 'UFPB', 'UFAL',
    'UNIFAL-MG', 'UFCG', 'UFCAT', 'UFG', 'UNIFEI', 'UFJ', 'UFJF', 'UFLA',
    'UFMT', 'UFMS', 'UFMG', 'UFOP', 'UFPEL', 'UFPE', 'UFR', 'UFRR', 'UFSC',
    'UFSM', 'UFS', 'UFSCAR', 'UFSJ', 'UNIFESP', 'UFU', 'UFV', 'UFAC', 'UFAPE',
    'UFAM', 'UFCA', 'UFC', 'UFDPAR', 'UFES', 'UNIRIO', 'UFMA', 'UFNT', 'UFOB',
    'UFPR', 'UFPI', 'UFRB', 'FURG', 'UFRN', 'UFRGS', 'UFRJ', 'UFSB', 'UNIFESSPA',
    'UFTM', 'UFVJM', 'UTFPR', 'UNILAB', 'UNB',
  ]
  const names = aliases.map(alias => resolveOfficialInstitutionNameByAcronym(alias))

  assert.equal(aliases.length, 65)
  assert.ok(names.every(Boolean))
  assert.equal(new Set(names).size, 65)
})
