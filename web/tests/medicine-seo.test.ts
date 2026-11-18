import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMedicineOffer,
  groupMedicineByUniversity,
  isMedicineCourse,
  medicineHubFaq,
  medicineUniversityFaq,
  rankingEdition,
  rankMedicineOffers,
  summarizeMedicine,
  summarizeMedicineByState,
  type MedicineOffer,
} from '../lib/medicine-seo'
import type { CourseReference, CourseSearchItem } from '../types/course'

function course(overrides: Partial<CourseSearchItem> = {}): CourseSearchItem {
  return {
    id: 1,
    code: 685,
    name: 'Medicina',
    university: 'Universidade Federal do Rio Grande do Norte',
    campus: 'Campus Central',
    city: 'Natal',
    state: 'RN',
    degree: 'Bacharelado',
    schedule: 'Integral',
    ...overrides,
  }
}

function reference(overrides: Partial<CourseReference> = {}): CourseReference {
  return {
    courseCode: 685,
    edition: 2026,
    modalityId: '41',
    modalityOfficialName: 'Ampla concorrência',
    cutoff: 800,
    referenceType: 'historical',
    partialScores: [],
    capturedAt: null,
    weightsEdition: null,
    minimums: null,
    sourceUrl: 'https://sisu.mec.gov.br/vagas',
    verification: { status: 'unverified' },
    ...overrides,
  }
}

function offer(overrides: Partial<CourseSearchItem>, cutoff: number | null, edition: number | null = 2026): MedicineOffer {
  return { course: course(overrides), cutoff, edition, referenceType: edition === null ? null : 'historical' }
}

test('reconhece somente o curso chamado exatamente Medicina', () => {
  assert.equal(isMedicineCourse('Medicina'), true)
  assert.equal(isMedicineCourse('  MEDICINA '), true)
  assert.equal(isMedicineCourse('Biomedicina'), false)
  assert.equal(isMedicineCourse('Medicina Veterinária'), false)
  assert.equal(isMedicineCourse(null), false)
})

test('usa a edição mais recente com nota de corte de cada oferta', () => {
  const built = buildMedicineOffer(course(), [
    reference({ edition: 2025, cutoff: 790 }),
    reference({ edition: 2026, cutoff: null }),
    reference({ edition: 2024, cutoff: 780 }),
  ])
  assert.deepEqual([built.edition, built.cutoff], [2025, 790])

  const empty = buildMedicineOffer(course(), [reference({ edition: 2026, cutoff: null })])
  assert.deepEqual([empty.edition, empty.cutoff], [2026, null])
})

test('ranqueia maiores e menores notas apenas da edição mais recente', () => {
  const offers = [
    offer({ code: 1, university: 'Universidade Federal Rural do Semi-Árido', city: 'Mossoró' }, 779.72),
    offer({ code: 2, university: 'Universidade da Integração Internacional da Lusofonia Afro-Brasileira', city: 'Baturité', state: 'CE' }, 865.3),
    offer({ code: 3 }, 810),
    offer({ code: 4, city: 'Caicó' }, 700, 2025),
    offer({ code: 5, city: 'Sem nota' }, null),
  ]

  assert.equal(rankingEdition(offers), 2026)
  assert.deepEqual(rankMedicineOffers(offers, 2026, 'lowest', 2).map(item => item.course.code), [1, 3])
  assert.deepEqual(rankMedicineOffers(offers, 2026, 'highest', 1).map(item => item.course.code), [2])
  assert.deepEqual(rankMedicineOffers(offers, null, 'highest'), [])

  const summary = summarizeMedicine(offers)
  assert.equal(summary.totalOffers, 5)
  assert.equal(summary.lowest?.cutoff, 779.72)
  assert.equal(summary.highest?.cutoff, 865.3)

  const states = summarizeMedicineByState(offers, 2026)
  assert.deepEqual(states.map(state => [state.state, state.offers]), [['CE', 1], ['RN', 4]])
  assert.equal(states[1].highest?.cutoff, 810)
})

test('agrupa por instituição usando a sigla quando ela é única', () => {
  const groups = groupMedicineByUniversity([
    offer({ code: 1, city: 'Natal' }, 810),
    offer({ code: 2, city: 'Caicó' }, 790),
    offer({ code: 3, university: 'Universidade Estadual Sem Sigla Cadastrada', state: 'PB' }, 760),
  ])
  const ufrn = groups.find(group => group.offers.length === 2)
  assert.ok(ufrn)
  assert.equal(ufrn.slug, 'ufrn')
  assert.deepEqual(ufrn.offers.map(item => item.course.city), ['Caicó', 'Natal'])
  assert.ok(groups.some(group => group.slug === 'universidade-estadual-sem-sigla-cadastrada'))
})

test('gera FAQ do hub e da instituição com os valores reais', () => {
  const offers = [offer({ code: 1 }, 810), offer({ code: 2, city: 'Caicó' }, 790.5)]
  const hub = medicineHubFaq(summarizeMedicine(offers))
  assert.match(hub[0].question, /menor nota de corte de Medicina no SISU 2026/)
  assert.match(hub[0].answer, /790,50/)
  assert.ok(hub.some(item => /SISU 2027/.test(item.question)))

  const [university] = groupMedicineByUniversity(offers)
  const faq = medicineUniversityFaq(university)
  assert.match(faq[0].question, /Medicina na UFRN no SISU 2026/)
  assert.match(faq[0].answer, /Caicó\/RN \(Integral\): 790,50; Natal\/RN \(Integral\): 810,00/)
})
