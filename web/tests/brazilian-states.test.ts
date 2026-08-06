import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BRAZILIAN_STATES,
  getBrazilianStateName,
  normalizeBrazilianState,
  resolveBrazilianStateCode,
} from '../lib/brazilian-states'

test('mantém um cadastro completo e sem duplicações das 27 UFs', () => {
  assert.equal(BRAZILIAN_STATES.length, 27)
  assert.equal(new Set(BRAZILIAN_STATES.map(state => state.code)).size, 27)
  assert.equal(new Set(BRAZILIAN_STATES.map(state => state.name)).size, 27)
})

test('resolve todas as siglas e todos os nomes oficiais', () => {
  for (const state of BRAZILIAN_STATES) {
    assert.equal(resolveBrazilianStateCode(state.code), state.code)
    assert.equal(resolveBrazilianStateCode(state.code.toLowerCase()), state.code)
    assert.equal(resolveBrazilianStateCode(state.name), state.code)
    assert.equal(resolveBrazilianStateCode(state.name.toLowerCase()), state.code)
    assert.equal(getBrazilianStateName(state.code), state.name)
    assert.equal(getBrazilianStateName(state.code.toLowerCase()), state.name)
  }
})

test('resolve nomes sem acentos e com espaços ou caixa diferentes', () => {
  for (const state of BRAZILIAN_STATES) {
    const accentlessName = state.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    assert.equal(resolveBrazilianStateCode(`  ${accentlessName.toLowerCase()}  `), state.code)
  }

  assert.equal(resolveBrazilianStateCode('SAO   PAULO'), 'SP')
  assert.equal(resolveBrazilianStateCode('espirito-santo'), 'ES')
  assert.equal(normalizeBrazilianState('  Maranhão  '), 'MARANHAO')
})

test('retorna null para consultas vazias ou desconhecidas', () => {
  assert.equal(resolveBrazilianStateCode(''), null)
  assert.equal(resolveBrazilianStateCode(null), null)
  assert.equal(resolveBrazilianStateCode('XX'), null)
  assert.equal(resolveBrazilianStateCode('Universidade Federal do Maranhão'), null)
  assert.equal(getBrazilianStateName(undefined), null)
  assert.equal(getBrazilianStateName('XX'), null)
})
