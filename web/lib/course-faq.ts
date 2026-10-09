import { courseQualifiers, formatScore, institutionLabel } from '@/lib/course-seo'
import type { Course, CourseWeights } from '@/lib/supabase'
import type { CourseReference } from '@/types/course'

export interface FaqItem {
  question: string
  answer: string
}

export interface CourseAnswers {
  /** Direct sentence shown at the top of the page, answering the main search. */
  lead: string
  faq: FaqItem[]
}

export interface CourseAnswersInput {
  course: Pick<Course, 'name' | 'university' | 'city' | 'state' | 'degree' | 'schedule'>
  /** Latest edition with any reference for this course. */
  edition: number | null
  /** Ampla concorrência reference of that edition, if any. */
  ampla: CourseReference | null
  /** Modalities of that edition with a real cut-off (the rows the table shows with a number). */
  modalitiesWithCutoff: number
  latestWeights: CourseWeights | null
  /** Ampla concorrência cut-offs across editions, newest first, real values only. */
  history: Array<{ edition: number; cutoff: number }>
}

const MASCULINE_INSTITUTION = /^(instituto|centro|col[eé]gio)\b/i

/**
 * The source stores 0.01 where the institution set no floor (the candidate only
 * has to score above zero). Anything below one point is not a real minimum.
 */
export const REAL_MINIMUM_THRESHOLD = 1

export function isRealMinimum(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= REAL_MINIMUM_THRESHOLD
}

const WEIGHT_FIELDS = [
  ['Redação', 'peso_red', 'min_red'],
  ['Linguagens', 'peso_ling', 'min_ling'],
  ['Matemática', 'peso_mat', 'min_mat'],
  ['Ciências Humanas', 'peso_ch', 'min_ch'],
  ['Ciências da Natureza', 'peso_cn', 'min_cn'],
] as const

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

/** "na UFRN", "no IFRN": the article follows the institution's official name. */
export function atInstitution(university: string | null): string {
  const label = institutionLabel(university)
  if (!label) return ''
  return `${MASCULINE_INSTITUTION.test(university?.trim() ?? '') ? 'no' : 'na'} ${label}`
}

/**
 * "Administração na UFMT (Cuiabá/MT, Bacharelado, Noturno)". City, degree and
 * shift are part of the subject because the same course name is offered several
 * times by one institution, each offer with its own cut-off.
 */
export function courseSubject(course: CourseAnswersInput['course']): string {
  const base = [course.name, atInstitution(course.university)].filter(Boolean).join(' ')
  const qualifiers = courseQualifiers(course)
  return qualifiers ? `${base} (${qualifiers})` : base
}

export function courseAnswers(input: CourseAnswersInput): CourseAnswers {
  const { course, edition, ampla, modalitiesWithCutoff, latestWeights, history } = input
  const subject = courseSubject(course)
  const hasCutoff = ampla !== null && ampla.cutoff !== null && ampla.cutoff > 0
  const faq: FaqItem[] = []

  let lead: string
  if (hasCutoff && edition !== null) {
    // A reference still flagged as partial is stated without "foi": the edition may be open.
    lead = ampla.referenceType === 'partial'
      ? `No SISU ${edition}, a referência de nota de corte de ${subject} na ampla concorrência é ${formatScore(ampla.cutoff)}.`
      : `No SISU ${edition}, a nota de corte de ${subject} foi ${formatScore(ampla.cutoff)} na ampla concorrência.`
    const modalities = modalitiesWithCutoff > 0
      ? ` A edição tem ${modalitiesWithCutoff} ${modalitiesWithCutoff === 1 ? 'modalidade' : 'modalidades'} com nota de corte na base XTRI.`
      : ''
    faq.push({
      question: `Qual a nota de corte de ${subject} no SISU ${edition}?`,
      answer: `${lead}${modalities}`,
    })
  } else if (edition !== null) {
    lead = `A base XTRI ainda não tem a nota de corte de ${subject} na ampla concorrência do SISU ${edition}.`
    const [latest] = history
    if (latest && latest.edition < edition) {
      lead += ` A mais recente registrada é ${formatScore(latest.cutoff)}, do SISU ${latest.edition}.`
    }
  } else {
    lead = `A base XTRI ainda não tem nota de corte de ${subject} na ampla concorrência.`
  }

  if (latestWeights) {
    const weights = WEIGHT_FIELDS.flatMap(([label, weightKey]) => {
      const value = latestWeights[weightKey]
      return value === null ? [] : [`${label}: peso ${formatNumber(value)}`]
    })
    if (weights.length > 0) {
      faq.push({
        question: `Quais são os pesos do ENEM para ${subject}?`,
        answer: `Na edição ${latestWeights.year}: ${weights.join('; ')}.`,
      })
    }

    const minimums = WEIGHT_FIELDS.flatMap(([label, , minimumKey]) => {
      const value = latestWeights[minimumKey]
      return isRealMinimum(value) ? [`${label}: ${formatNumber(value)}`] : []
    })
    if (isRealMinimum(latestWeights.min_enem)) {
      minimums.push(`média no ENEM: ${formatNumber(latestWeights.min_enem)}`)
    }
    if (minimums.length > 0) {
      faq.push({
        question: `Qual a nota mínima do ENEM para concorrer a ${subject}?`,
        answer: minimums.length === 1
          ? `Na edição ${latestWeights.year}, a nota mínima é: ${minimums[0]}. Quem fica abaixo dela não concorre à vaga.`
          : `Na edição ${latestWeights.year}, as notas mínimas são: ${minimums.join('; ')}. Quem fica abaixo de uma delas não concorre à vaga.`,
      })
    }
  }

  // Only a like-for-like comparison is stated: the page's own edition, closed,
  // against the edition immediately before it.
  const [current, previous] = history
  if (
    hasCutoff
    && edition !== null
    && ampla.referenceType !== 'partial'
    && current
    && previous
    && current.edition === edition
    && previous.edition === edition - 1
  ) {
    const difference = Math.round((current.cutoff - previous.cutoff) * 100) / 100
    const size = Math.abs(difference)
    const change = size === 0
      ? 'ficou igual'
      : `${difference > 0 ? 'subiu' : 'caiu'} ${formatNumber(size)} ${size === 1 ? 'ponto' : 'pontos'}`
    faq.push({
      question: `A nota de corte de ${subject} subiu ou caiu?`,
      answer: `Na ampla concorrência, a nota de corte ${change}: foi de ${formatScore(previous.cutoff)} no SISU ${previous.edition} para ${formatScore(current.cutoff)} no SISU ${current.edition}.`,
    })
  }

  return { lead, faq }
}

export function faqJsonLd(faq: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}
