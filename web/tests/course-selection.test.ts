import assert from 'node:assert/strict'
import test from 'node:test'

import { getEffectiveCutoff, selectLatestReference } from '../lib/course-selection'
import type { CourseReference } from '../types/course'

function reference(overrides: Partial<CourseReference>): CourseReference {
  return {
    courseCode: 123,
    edition: 2026,
    modalityId: '41',
    modalityOfficialName: 'Ampla concorrência',
    cutoff: 801.46,
    referenceType: 'historical',
    partialScores: [],
    capturedAt: '2026-01-20T12:00:00.000Z',
    weightsEdition: 2026,
    minimums: null,
    sourceUrl: 'https://sisu.mec.gov.br/vagas',
    verification: { status: 'unverified' },
    ...overrides,
  }
}

test('Medicina/UFGD/2026 seleciona L1 769,86 e nunca Ampla 801,46', () => {
  const references = [
    reference({ modalityId: '41', cutoff: 801.46 }),
    reference({
      modalityId: '686',
      modalityOfficialName: 'L1 — escola pública, renda de até 1 salário mínimo per capita',
      cutoff: 769.86,
    }),
  ]

  const selection = selectLatestReference(references, '686')
  assert.equal(selection.ok, true)
  if (selection.ok) assert.equal(selection.cutoff, 769.86)
})

test('não faz fallback quando a modalidade oficial não existe', () => {
  const selection = selectLatestReference([reference({})], '686')
  assert.deepEqual(selection, { ok: false, error: 'NO_REFERENCE_FOR_MODALITY' })
})

test('usa a parcial de maior dia mesmo quando a entrada vem fora de ordem', () => {
  const value = getEffectiveCutoff(reference({
    cutoff: null,
    referenceType: 'partial',
    partialScores: [
      { day: 4, score: 701.25 },
      { day: 1, score: 690 },
      { day: 3, score: 699.5 },
    ],
  }))

  assert.equal(value, 701.25)
})

test('rejeita notas de referência fora de 0 a 1000', () => {
  const selection = selectLatestReference([
    reference({ cutoff: 1001, partialScores: [{ day: 1, score: -1 }] }),
  ], '41')

  assert.deepEqual(selection, { ok: false, error: 'NO_VALID_REFERENCE' })
})
