import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCourseReference } from '../lib/course-reference'
import type { CourseWeights, CutScore } from '../lib/supabase'

const NOW = new Date('2026-01-20T12:00:00.000Z')

function score(overrides: Partial<CutScore> = {}): CutScore {
  return {
    id: 1,
    course_id: 10,
    year: 2026,
    modality_code: 1,
    modality_name: 'Ampla concorrência',
    cut_score: 700,
    applicants: 100,
    vacancies: 10,
    captured_at: '2026-01-20T11:00:00.000Z',
    partial_scores: [],
    ...overrides,
  }
}

function weights(overrides: Partial<CourseWeights> = {}): CourseWeights {
  return {
    id: 1,
    course_id: 10,
    year: 2026,
    peso_red: 1,
    peso_ling: 1,
    peso_mat: 1,
    peso_ch: 1,
    peso_cn: 1,
    min_red: 0,
    min_ling: 0,
    min_mat: 0,
    min_ch: 0,
    min_cn: 0,
    min_enem: 0,
    ...overrides,
  }
}

test('builds partial reference with official source and capture intermediary', () => {
  const reference = buildCourseReference(12345, score({
    partial_scores: [{ day: 1, score: 695.5 }],
  }), weights(), NOW)!

  assert.equal(reference.courseCode, 12345)
  assert.equal(reference.modalityId, '1')
  assert.equal(reference.referenceType, 'partial')
  assert.equal(reference.sourceUrl, 'https://sisu.mec.gov.br/vagas')
  assert.equal(reference.intermediary, 'MeuSISU')
  assert.match(reference.intermediaryUrl!, /getCourseData\?courseCode=12345$/)
  assert.equal(reference.weightsEdition, 2026)
  assert.equal(reference.verification.status, 'unverified')
})

test('marks a reference stale only after the 36-hour freshness window', () => {
  const insideWindow = buildCourseReference(12345, score({
    captured_at: '2026-01-19T00:00:01.000Z',
  }), null, NOW, 2026)!
  const outsideWindow = buildCourseReference(12345, score({
    captured_at: '2026-01-18T23:59:59.000Z',
  }), null, NOW, 2026)!

  assert.equal(insideWindow.verification.status, 'unverified')
  assert.equal(outsideWindow.verification.status, 'stale')
})

test('keeps recently recaptured historical data unverified, never verified', () => {
  const reference = buildCourseReference(12345, score({
    year: 2025,
    captured_at: '2024-01-01T00:00:00.000Z',
  }), null, NOW)!

  assert.equal(reference.referenceType, 'historical')
  assert.equal(reference.verification.status, 'unverified')
  assert.notEqual(reference.verification.status, 'verified')
})

test('uses final only when a current edition has a cut score and no partials', () => {
  const finalReference = buildCourseReference(12345, score(), null, NOW)!
  const unknownReference = buildCourseReference(12345, score({ cut_score: null }), null, NOW)

  assert.equal(finalReference.referenceType, 'final')
  assert.equal(unknownReference, null)
})
