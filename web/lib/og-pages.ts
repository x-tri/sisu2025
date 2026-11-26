import { loadCoursePage, loadMedicineUniversity, loadUniversity } from '@/lib/course-page-data'
import {
  courseQualifiers,
  formatScore,
  hasRealCutoff,
  institutionLabel,
  isAmplaReference,
  latestEdition,
  referencesForEdition,
} from '@/lib/course-seo'
import { rankingEdition, rankMedicineOffers } from '@/lib/medicine-seo'
import type { OgCardProps } from '@/lib/og-card'

export interface OgPage {
  alt: string
  card: OgCardProps
}

const SITE = 'XTRI SISU'
const FALLBACK: OgPage = {
  alt: `Nota de corte no SISU · ${SITE}`,
  card: { kicker: 'SISU 2027 · NOTA DE CORTE', title: 'Nota de corte no SISU', highlight: 'corte', subtitle: 'Compare sua nota do ENEM com a nota de corte de cada curso' },
}

export function staticOgPage(title: string, highlight: string, kicker: string, subtitle?: string): OgPage {
  return { alt: `${title} · ${SITE}`, card: { kicker, title, highlight, subtitle } }
}

/** Never throws: a failed lookup falls back to the generic card instead of a broken share image. */
async function safely(build: () => Promise<OgPage | null>): Promise<OgPage> {
  try {
    return (await build()) ?? FALLBACK
  } catch {
    return FALLBACK
  }
}

export function courseOgPage(code: number | null): Promise<OgPage> {
  return safely(async () => {
    const data = code === null ? null : await loadCoursePage(code)
    if (!data) return null

    const { course, references } = data
    const edition = latestEdition(references)
    const institution = institutionLabel(course.university)
    const ampla = edition === null ? undefined : referencesForEdition(references, edition).find(isAmplaReference)
    const qualifiers = courseQualifiers(course)

    return {
      alt: `Nota de corte de ${course.name}${institution ? ` na ${institution}` : ''} · ${SITE}`,
      card: {
        kicker: `NOTA DE CORTE${edition ? ` · SISU ${edition}` : ''}`,
        title: `${course.name}${institution ? ` ${institution}` : ''}`,
        highlight: institution ?? undefined,
        subtitle: [course.university, qualifiers].filter(Boolean).join(' · ') || undefined,
        panel: ampla && edition !== null && hasRealCutoff(ampla)
          ? { label: 'AMPLA CONCORRÊNCIA', value: formatScore(ampla.cutoff), note: `SISU ${edition}` }
          : undefined,
      },
    }
  })
}

export function medicineUniversityOgPage(slug: string): Promise<OgPage> {
  return safely(async () => {
    const university = await loadMedicineUniversity(slug)
    if (!university) return null

    const edition = rankingEdition(university.offers)
    const lowest = rankMedicineOffers(university.offers, edition, 'lowest', 1)[0]

    return {
      alt: `Nota de corte de Medicina na ${university.label} · ${SITE}`,
      card: {
        kicker: `NOTA DE CORTE${edition ? ` · SISU ${edition}` : ''}`,
        title: `Medicina ${university.label}`,
        highlight: university.label,
        subtitle: [university.name, university.states.join(', ')].filter(Boolean).join(' · '),
        panel: lowest && edition !== null
          ? { label: 'MENOR NOTA DE CORTE', value: formatScore(lowest.cutoff), note: `Ampla concorrência · SISU ${edition}` }
          : undefined,
      },
    }
  })
}

export function universityOgPage(slug: string): Promise<OgPage> {
  return safely(async () => {
    const university = await loadUniversity(slug)
    if (!university) return null

    const label = university.acronym ?? university.name
    const count = university.courses.length

    return {
      alt: `Notas de corte da ${label} no SISU · ${SITE}`,
      card: {
        kicker: 'NOTA DE CORTE · SISU 2027',
        title: `Notas de corte ${label}`,
        highlight: label,
        subtitle: [university.name, university.states.join(', ')].filter(Boolean).join(' · '),
        panel: { label: 'CURSOS NO SISU', value: new Intl.NumberFormat('pt-BR').format(count) },
      },
    }
  })
}
