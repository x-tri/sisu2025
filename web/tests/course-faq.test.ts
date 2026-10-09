import assert from 'node:assert/strict'
import test from 'node:test'

import { atInstitution, courseAnswers, courseSubject, isRealMinimum, type CourseAnswersInput } from '../lib/course-faq'
import { courseQualifiers, hasRealCutoff, serializeJsonLd } from '../lib/course-seo'
import type { CourseWeights } from '../lib/supabase'
import type { CourseReference } from '../types/course'

const COURSE = {
  name: 'Administração',
  university: 'Universidade Federal de Mato Grosso',
  city: 'Cuiabá',
  state: 'MT',
  degree: 'Bacharelado',
  schedule: 'Noturno',
}

const SUBJECT = 'Administração na UFMT (Cuiabá/MT, Bacharelado, Noturno)'

const WEIGHTS: CourseWeights = {
  id: 1,
  course_id: 14,
  year: 2026,
  peso_red: 3,
  peso_ling: 2.25,
  peso_mat: 1.25,
  peso_ch: 2,
  peso_cn: 1,
  min_red: 500,
  min_ling: 450,
  min_mat: 300,
  min_ch: 450,
  min_cn: 300,
  min_enem: 450,
}

function ampla(overrides: Partial<CourseReference> = {}): CourseReference {
  return {
    courseCode: 14,
    edition: 2026,
    modalityId: '41',
    modalityOfficialName: 'Ampla concorrência',
    cutoff: 653.68,
    referenceType: 'historical',
    partialScores: [],
    capturedAt: null,
    weightsEdition: 2026,
    minimums: null,
    sourceUrl: 'https://sisu.mec.gov.br/vagas',
    verification: { status: 'unverified' },
    ...overrides,
  }
}

function input(overrides: Partial<CourseAnswersInput> = {}): CourseAnswersInput {
  return {
    course: COURSE,
    edition: 2026,
    ampla: ampla(),
    modalitiesWithCutoff: 9,
    latestWeights: WEIGHTS,
    history: [
      { edition: 2026, cutoff: 653.68 },
      { edition: 2025, cutoff: 648.95 },
    ],
    ...overrides,
  }
}

function allText(answers: ReturnType<typeof courseAnswers>): string {
  return [answers.lead, ...answers.faq.flatMap(item => [item.question, item.answer])].join(' ')
}

test('atInstitution picks the article from the official name', () => {
  assert.equal(atInstitution('Universidade Federal de São Paulo'), 'na UNIFESP')
  assert.equal(
    atInstitution('Instituto Federal de Educação, Ciência e Tecnologia do Rio Grande do Norte'),
    'no IFRN',
  )
  assert.equal(atInstitution('Colégio Pedro II'), 'no CPII')
  assert.equal(atInstitution(null), '')
})

test('the subject tells apart offers of the same course at one institution', () => {
  assert.equal(courseSubject(COURSE), SUBJECT)
  assert.notEqual(courseSubject(COURSE), courseSubject({ ...COURSE, schedule: 'Matutino' }))
  assert.notEqual(courseSubject(COURSE), courseSubject({ ...COURSE, city: 'Sinop' }))
  assert.notEqual(courseSubject(COURSE), courseSubject({ ...COURSE, degree: 'Licenciatura' }))
  assert.equal(
    courseSubject({ ...COURSE, city: null, state: null, degree: null, schedule: null }),
    'Administração na UFMT',
  )
})

test('courseQualifiers flattens parentheses inside the degree', () => {
  assert.equal(
    courseQualifiers({ city: 'Guarulhos', state: 'SP', degree: 'Área Básica de Ingresso (ABI)', schedule: 'Noturno' }),
    'Guarulhos/SP, Área Básica de Ingresso – ABI, Noturno',
  )
})

test('lead states the ampla concorrência cut-off for a closed edition', () => {
  const { lead, faq } = courseAnswers(input())

  assert.equal(lead, `No SISU 2026, a nota de corte de ${SUBJECT} foi 653,68 na ampla concorrência.`)
  assert.deepEqual(faq.map(item => item.question), [
    `Qual a nota de corte de ${SUBJECT} no SISU 2026?`,
    `Quais são os pesos do ENEM para ${SUBJECT}?`,
    `Qual a nota mínima do ENEM para concorrer a ${SUBJECT}?`,
    `A nota de corte de ${SUBJECT} subiu ou caiu?`,
  ])
  assert.match(faq[0].answer, /A edição tem 9 modalidades com nota de corte na base XTRI\.$/)
  assert.match(faq[1].answer, /Redação: peso 3; Linguagens: peso 2,25/)
  assert.match(faq[2].answer, /as notas mínimas são: Redação: 500; .*média no ENEM: 450\. Quem fica abaixo de uma delas/)
  assert.match(faq[3].answer, /subiu 4,73 pontos: foi de 648,95 no SISU 2025 para 653,68 no SISU 2026/)
})

test('the modality count is the number of rows with a real cut-off', () => {
  const rows = [ampla(), ampla({ modalityId: '682', cutoff: 0 }), ampla({ modalityId: '683', cutoff: null })]
  const withCutoff = rows.filter(hasRealCutoff).length

  assert.equal(withCutoff, 1)
  assert.match(
    courseAnswers(input({ modalitiesWithCutoff: withCutoff })).faq[0].answer,
    /A edição tem 1 modalidade com nota de corte na base XTRI\.$/,
  )
  assert.doesNotMatch(courseAnswers(input({ modalitiesWithCutoff: 0 })).faq[0].answer, /modalidade/)
})

test('a reference flagged as partial is not described as a closed result', () => {
  const answers = courseAnswers(input({ ampla: ampla({ referenceType: 'partial' }) }))

  assert.equal(answers.lead, `No SISU 2026, a referência de nota de corte de ${SUBJECT} na ampla concorrência é 653,68.`)
  assert.doesNotMatch(allText(answers), /\bfoi\b|subiu|caiu/)
})

test('a latest edition without cut-off points to the most recent stored one', () => {
  const { lead, faq } = courseAnswers(input({
    ampla: ampla({ cutoff: null }),
    history: [
      { edition: 2025, cutoff: 697.37 },
      { edition: 2024, cutoff: 698.86 },
    ],
  }))

  assert.equal(
    lead,
    `A base XTRI ainda não tem a nota de corte de ${SUBJECT} na ampla concorrência do SISU 2026. A mais recente registrada é 697,37, do SISU 2025.`,
  )
  assert.equal(faq.some(item => /subiu ou caiu/.test(item.question)), false)
  assert.equal(faq.some(item => /^Qual a nota de corte/.test(item.question)), false)
})

test('a stored cut-off of zero is treated as no cut-off', () => {
  const { lead } = courseAnswers(input({ ampla: ampla({ cutoff: 0 }), history: [] }))

  assert.equal(lead, `A base XTRI ainda não tem a nota de corte de ${SUBJECT} na ampla concorrência do SISU 2026.`)
})

test('missing data produces no invented answers', () => {
  const answers = courseAnswers(input({ edition: null, ampla: null, latestWeights: null, history: [] }))

  assert.equal(answers.lead, `A base XTRI ainda não tem nota de corte de ${SUBJECT} na ampla concorrência.`)
  assert.deepEqual(answers.faq, [])
})

test('the trend is stated only against the edition immediately before', () => {
  const skipped = courseAnswers(input({
    history: [
      { edition: 2026, cutoff: 472.39 },
      { edition: 2024, cutoff: 553.31 },
    ],
  }))
  assert.equal(skipped.faq.some(item => /subiu ou caiu/.test(item.question)), false)

  const single = courseAnswers(input({ history: [{ edition: 2026, cutoff: 653.68 }] }))
  assert.equal(single.faq.some(item => /subiu ou caiu/.test(item.question)), false)
})

test('a drop, a tie and a one-point change are worded correctly', () => {
  const trend = (current: number, previous: number): string => {
    const { faq } = courseAnswers(input({
      ampla: ampla({ cutoff: current }),
      history: [
        { edition: 2026, cutoff: current },
        { edition: 2025, cutoff: previous },
      ],
    }))
    return faq[faq.length - 1].answer
  }

  assert.match(trend(700, 710.5), /caiu 10,5 pontos/)
  assert.match(trend(700, 700), /ficou igual/)
  assert.match(trend(701, 700), /subiu 1 ponto:/)
  assert.match(trend(700.3, 700.1), /subiu 0,2 pontos/)
})

test('the 0.01 placeholder is never reported as a minimum score', () => {
  assert.equal(isRealMinimum(0.01), false)
  assert.equal(isRealMinimum(0), false)
  assert.equal(isRealMinimum(null), false)
  assert.equal(isRealMinimum(1), true)
  assert.equal(isRealMinimum(450), true)

  const { faq } = courseAnswers(input({
    latestWeights: { ...WEIGHTS, min_red: 500, min_ling: 450, min_mat: 450, min_ch: 450, min_cn: 450, min_enem: 0.01 },
  }))
  const minimum = faq.find(item => item.question.startsWith('Qual a nota mínima'))

  assert.ok(minimum)
  assert.match(minimum.answer, /Redação: 500; Linguagens: 450/)
  assert.doesNotMatch(minimum.answer, /0,01|média no ENEM/)

  const onlyPlaceholders = courseAnswers(input({
    latestWeights: { ...WEIGHTS, min_red: 0.01, min_ling: 0.01, min_mat: 0.01, min_ch: 0.01, min_cn: 0.01, min_enem: 0.01 },
  }))
  assert.equal(onlyPlaceholders.faq.some(item => item.question.startsWith('Qual a nota mínima')), false)
})

test('a single real minimum is written in the singular', () => {
  const only = (weights: Partial<CourseWeights>): string => {
    const { faq } = courseAnswers(input({
      latestWeights: { ...WEIGHTS, min_red: 0.01, min_ling: 0.01, min_mat: 0.01, min_ch: 0.01, min_cn: 0.01, min_enem: 0.01, ...weights },
    }))
    return faq.find(item => item.question.startsWith('Qual a nota mínima'))?.answer ?? ''
  }

  assert.equal(only({ min_red: 300 }), 'Na edição 2026, a nota mínima é: Redação: 300. Quem fica abaixo dela não concorre à vaga.')
  assert.equal(only({ min_enem: 450 }), 'Na edição 2026, a nota mínima é: média no ENEM: 450. Quem fica abaixo dela não concorre à vaga.')
})

test('serializeJsonLd escapes "<" and still parses to the same value', () => {
  const data = { name: 'Curso </script><script>alert(1)</script>' }
  const serialized = serializeJsonLd(data)

  assert.equal(serialized.includes('<'), false)
  assert.deepEqual(JSON.parse(serialized), data)
})
