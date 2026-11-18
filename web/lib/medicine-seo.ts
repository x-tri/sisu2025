import { atInstitution, type FaqItem } from '@/lib/course-faq'
import { formatScore, institutionLabel, slugify } from '@/lib/course-seo'
import type { CourseReference, CourseSearchItem, ReferenceType } from '@/types/course'

export const MEDICINE_HUB_PATH = '/simulador-sisu-medicina'

export interface MedicineOffer {
  course: CourseSearchItem
  /** Ampla concorrência cut-off of `edition`; null when the base has none. */
  cutoff: number | null
  edition: number | null
  referenceType: ReferenceType | null
}

export interface MedicineUniversity {
  slug: string
  name: string
  /** Acronym when curated, else the official name. */
  label: string
  states: string[]
  offers: MedicineOffer[]
}

export interface MedicineStateSummary {
  state: string
  offers: number
  highest: MedicineOffer | null
  lowest: MedicineOffer | null
}

const collator = new Intl.Collator('pt-BR')

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

/** Only the course named exactly "Medicina"; Biomedicina, Medicina Veterinária etc. are other courses. */
export function isMedicineCourse(name: string | null | undefined): boolean {
  return typeof name === 'string' && normalize(name) === 'medicina'
}

function hasCutoff(offer: MedicineOffer): offer is MedicineOffer & { cutoff: number; edition: number } {
  return offer.cutoff !== null && offer.cutoff > 0 && offer.edition !== null
}

/**
 * The most recent ampla concorrência cut-off of one offer. When the latest
 * edition has no value yet, the newest edition that has one is used instead.
 */
export function buildMedicineOffer(course: CourseSearchItem, references: CourseReference[]): MedicineOffer {
  const sorted = [...references].sort((left, right) => right.edition - left.edition)
  const withCutoff = sorted.find(reference => reference.cutoff !== null && reference.cutoff > 0)
  const chosen = withCutoff ?? sorted[0] ?? null
  return {
    course,
    cutoff: withCutoff?.cutoff ?? null,
    edition: chosen?.edition ?? null,
    referenceType: chosen?.referenceType ?? null,
  }
}

/** Edition used for rankings: the newest one with at least one real cut-off. */
export function rankingEdition(offers: MedicineOffer[]): number | null {
  return offers.reduce<number | null>(
    (latest, offer) => (hasCutoff(offer) && (latest === null || offer.edition > latest) ? offer.edition : latest),
    null,
  )
}

function compareOffers(left: MedicineOffer, right: MedicineOffer): number {
  return (
    collator.compare(institutionLabel(left.course.university) ?? '', institutionLabel(right.course.university) ?? '')
    || collator.compare(left.course.city ?? '', right.course.city ?? '')
    || left.course.code - right.course.code
  )
}

/** Offers of one edition ordered by cut-off; ties keep a stable alphabetical order. */
export function rankMedicineOffers(
  offers: MedicineOffer[],
  edition: number | null,
  direction: 'highest' | 'lowest',
  limit = 10,
): MedicineOffer[] {
  if (edition === null) return []
  const sign = direction === 'highest' ? -1 : 1
  return offers
    .filter(offer => hasCutoff(offer) && offer.edition === edition)
    .sort((left, right) => sign * ((left.cutoff ?? 0) - (right.cutoff ?? 0)) || compareOffers(left, right))
    .slice(0, limit)
}

export function summarizeMedicineByState(offers: MedicineOffer[], edition: number | null): MedicineStateSummary[] {
  const states = new Map<string, MedicineOffer[]>()
  for (const offer of offers) {
    const state = offer.course.state?.trim()
    if (!state) continue
    const list = states.get(state) ?? []
    list.push(offer)
    states.set(state, list)
  }

  return Array.from(states.entries())
    .map(([state, list]) => ({
      state,
      offers: list.length,
      highest: rankMedicineOffers(list, edition, 'highest', 1)[0] ?? null,
      lowest: rankMedicineOffers(list, edition, 'lowest', 1)[0] ?? null,
    }))
    .sort((left, right) => collator.compare(left.state, right.state))
}

/**
 * One page per institution. The slug is the acronym when no other institution
 * offering Medicina shares it, else the full official name.
 */
export function groupMedicineByUniversity(offers: MedicineOffer[]): MedicineUniversity[] {
  const byName = new Map<string, MedicineOffer[]>()
  for (const offer of offers) {
    const name = offer.course.university?.trim()
    if (!name) continue
    const list = byName.get(name) ?? []
    list.push(offer)
    byName.set(name, list)
  }

  const labelCounts = new Map<string, number>()
  for (const name of Array.from(byName.keys())) {
    const labelSlug = slugify(institutionLabel(name) ?? name)
    labelCounts.set(labelSlug, (labelCounts.get(labelSlug) ?? 0) + 1)
  }

  const groups = new Map<string, MedicineUniversity>()
  for (const [name, list] of Array.from(byName.entries())) {
    const label = institutionLabel(name) ?? name
    const labelSlug = slugify(label)
    const slug = labelCounts.get(labelSlug) === 1 && labelSlug ? labelSlug : slugify(name)
    if (!slug) continue

    const existing = groups.get(slug)
    const group = existing ?? { slug, name, label, states: [], offers: [] }
    group.offers.push(...list)
    for (const offer of list) {
      if (offer.course.state && !group.states.includes(offer.course.state)) group.states.push(offer.course.state)
    }
    groups.set(slug, group)
  }

  const result = Array.from(groups.values())
  for (const group of result) {
    group.states.sort(collator.compare)
    group.offers.sort((left, right) => (
      collator.compare(left.course.city ?? '', right.course.city ?? '')
      || collator.compare(left.course.schedule ?? '', right.course.schedule ?? '')
      || left.course.code - right.course.code
    ))
  }
  return result.sort((left, right) => collator.compare(left.label, right.label))
}

export function medicineUniversityPath(slug: string): string {
  return `/nota-de-corte-medicina/${slug}`
}

export function offerPlace(offer: MedicineOffer): string {
  return [offer.course.city, offer.course.state].filter(Boolean).join('/')
}

function offerLabel(offer: MedicineOffer): string {
  const label = institutionLabel(offer.course.university) ?? 'instituição não informada'
  const place = offerPlace(offer)
  return place ? `${label} (${place})` : label
}

export interface MedicineHubSummary {
  edition: number | null
  totalOffers: number
  totalUniversities: number
  highest: MedicineOffer | null
  lowest: MedicineOffer | null
}

export function summarizeMedicine(offers: MedicineOffer[]): MedicineHubSummary {
  const edition = rankingEdition(offers)
  return {
    edition,
    totalOffers: offers.length,
    totalUniversities: groupMedicineByUniversity(offers).length,
    highest: rankMedicineOffers(offers, edition, 'highest', 1)[0] ?? null,
    lowest: rankMedicineOffers(offers, edition, 'lowest', 1)[0] ?? null,
  }
}

export function medicineHubFaq(summary: MedicineHubSummary): FaqItem[] {
  const faq: FaqItem[] = []
  const { edition, highest, lowest, totalOffers, totalUniversities } = summary

  if (edition !== null && highest && lowest) {
    faq.push({
      question: `Qual a menor nota de corte de Medicina no SISU ${edition}?`,
      answer: `Na ampla concorrência, a menor nota de corte de Medicina registrada na base XTRI no SISU ${edition} foi ${formatScore(lowest.cutoff)}, em ${offerLabel(lowest)}.`,
    })
    faq.push({
      question: `Qual a maior nota de corte de Medicina no SISU ${edition}?`,
      answer: `Na ampla concorrência, a maior nota de corte de Medicina registrada na base XTRI no SISU ${edition} foi ${formatScore(highest.cutoff)}, em ${offerLabel(highest)}.`,
    })
  }

  if (totalOffers > 0) {
    faq.push({
      question: 'Quantas vagas de Medicina existem no SISU?',
      answer: `A base XTRI reúne ${totalOffers} ${totalOffers === 1 ? 'oferta' : 'ofertas'} de Medicina em ${totalUniversities} ${totalUniversities === 1 ? 'instituição pública' : 'instituições públicas'} que participam do SISU. Cada oferta tem nota de corte própria por cidade, turno e modalidade.`,
    })
  }

  faq.push({
    question: 'Como simular minha nota para Medicina no SISU?',
    answer: 'Digite suas notas de Linguagens, Ciências Humanas, Ciências da Natureza, Matemática e Redação no simulador XTRI SISU e escolha a oferta de Medicina. O simulador calcula sua nota ponderada com os pesos da instituição e compara com a nota de corte da modalidade escolhida.',
  })
  faq.push({
    question: 'A nota de corte de Medicina do SISU 2027 já saiu?',
    answer: 'Não. A nota de corte só é conhecida durante e depois das inscrições do SISU. Até lá, a melhor referência são as notas de corte da edição anterior, mostradas nesta página com edição e origem identificadas.',
  })
  return faq
}

export function medicineUniversityFaq(university: MedicineUniversity): FaqItem[] {
  const faq: FaqItem[] = []
  const at = atInstitution(university.name) || `na ${university.label}`
  const edition = rankingEdition(university.offers)
  const ranked = rankMedicineOffers(university.offers, edition, 'lowest', university.offers.length)

  if (edition !== null && ranked.length > 0) {
    const answer = ranked.length === 1
      ? `No SISU ${edition}, a nota de corte de Medicina ${at} (${offerPlace(ranked[0]) || 'campus principal'}) foi ${formatScore(ranked[0].cutoff)} na ampla concorrência.`
      : `No SISU ${edition}, as notas de corte de Medicina ${at} na ampla concorrência foram: ${ranked.map(offer => `${offerPlace(offer) || 'campus principal'}${offer.course.schedule ? ` (${offer.course.schedule})` : ''}: ${formatScore(offer.cutoff)}`).join('; ')}.`
    faq.push({ question: `Qual a nota de corte de Medicina ${at} no SISU ${edition}?`, answer })
  }

  const cities = Array.from(new Set(university.offers.map(offerPlace).filter(Boolean)))
  if (cities.length > 0) {
    faq.push({
      question: `Em quais cidades há Medicina ${at} pelo SISU?`,
      answer: `Medicina é oferecida pelo SISU ${at} em ${cities.join(', ')}.`,
    })
  }

  faq.push({
    question: `Como saber se passo em Medicina ${at}?`,
    answer: `Abra a oferta de Medicina ${at}, informe suas notas do ENEM no simulador XTRI SISU e compare sua nota ponderada, calculada com os pesos da instituição, com a nota de corte da sua modalidade.`,
  })
  return faq
}
