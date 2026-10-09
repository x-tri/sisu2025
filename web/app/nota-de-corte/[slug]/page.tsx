import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'

import SeoShell, { type Crumb } from '@/components/seo/SeoShell'
import styles from '@/components/seo/SeoShell.module.css'
import { getBrazilianStateName } from '@/lib/brazilian-states'
import { courseAnswers, faqJsonLd, isRealMinimum } from '@/lib/course-faq'
import { loadCoursePage, type CoursePageData } from '@/lib/course-page-data'
import {
  amplaHistory,
  coursePath,
  courseQualifiers,
  formatScore,
  hasRealCutoff,
  institutionLabel,
  isAmplaReference,
  latestEdition,
  parseCourseSlug,
  referencesForEdition,
  serializeJsonLd,
  universityPath,
} from '@/lib/course-seo'
import type { ReferenceType } from '@/types/course'

interface PageProps {
  params: { slug: string }
}

const REFERENCE_TYPE_LABEL: Record<ReferenceType, string> = {
  final: 'final',
  historical: 'histórica',
  partial: 'parcial',
}

const WEIGHT_ROWS = [
  ['Redação', 'peso_red', 'min_red'],
  ['Linguagens', 'peso_ling', 'min_ling'],
  ['Matemática', 'peso_mat', 'min_mat'],
  ['Ciências Humanas', 'peso_ch', 'min_ch'],
  ['Ciências da Natureza', 'peso_cn', 'min_cn'],
] as const

function formatNumber(value: number | null): string {
  return value === null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

function formatMinimum(value: number | null): string {
  if (value === null) return '—'
  if (isRealMinimum(value)) return formatNumber(value)
  return value > 0 ? 'Sem mínimo (basta não zerar)' : 'Sem mínimo'
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Fortaleza' }).format(date)
}

function describe(data: CoursePageData) {
  const { course, latestWeights, references } = data
  const edition = latestEdition(references)
  const institution = institutionLabel(course.university)
  const place = [course.city, course.state].filter(Boolean).join('/')
  const editionReferences = edition === null ? [] : referencesForEdition(references, edition)
  const ampla = editionReferences.find(isAmplaReference) ?? null
  const history = amplaHistory(references)
  const answers = courseAnswers({
    course,
    edition,
    ampla,
    modalitiesWithCutoff: editionReferences.filter(hasRealCutoff).length,
    latestWeights,
    history,
  })
  return { edition, institution, place, editionReferences, ampla, history, answers }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const code = parseCourseSlug(params.slug)
  const data = code === null ? null : await loadCoursePage(code)
  if (!data) return { title: 'Curso não encontrado', robots: { index: false, follow: true } }

  const { course } = data
  const { edition, institution, answers } = describe(data)
  // City, degree and shift are in the title: the same course name is offered several times.
  const qualifiers = courseQualifiers(course)
  const title = `Nota de corte ${course.name}${institution ? ` ${institution}` : ''}${qualifiers ? ` (${qualifiers})` : ''}${edition ? ` no SISU ${edition}` : ''}`
  const description = `${answers.lead} Veja os pesos do ENEM, as notas mínimas e as demais modalidades.`
  const canonical = coursePath(course)

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website', locale: 'pt_BR' },
  }
}

export default async function CourseReferencePage({ params }: PageProps): Promise<JSX.Element> {
  const code = parseCourseSlug(params.slug)
  if (code === null) notFound()

  const data = await loadCoursePage(code)
  if (!data) notFound()

  const { course, latestWeights } = data
  const path = coursePath(course)
  if (`/nota-de-corte/${params.slug}` !== path) permanentRedirect(path)

  const { edition, institution, place, editionReferences, ampla, history, answers } = describe(data)
  const capturedAt = formatDate(ampla?.capturedAt ?? editionReferences[0]?.capturedAt ?? null)
  const stateName = getBrazilianStateName(course.state)
  const crumbs: Crumb[] = [
    { name: 'Simulador SISU', href: '/' },
    { name: 'Universidades', href: '/universidades' },
    ...(course.university ? [{ name: institution ?? course.university, href: universityPath(course.university) }] : []),
    { name: course.name },
  ]

  return (
    <SeoShell crumbs={crumbs} currentPath={path}>
      {answers.faq.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd(answers.faq)) }}
        />
      ) : null}
      <section className={styles.hero}>
        <h1>
          Nota de corte de {course.name}
          {institution ? ` — ${institution}` : ''}
          {edition ? ` no SISU ${edition}` : ''}
        </h1>
        <p className={styles.heroLead}>{answers.lead}</p>
        <p className={styles.heroMeta}>
          {[course.university, course.campus, [course.city, stateName ?? course.state].filter(Boolean).join(', ')]
            .filter(Boolean)
            .join(' · ')}
          <br />
          {[course.degree, course.schedule, `Código SISU ${course.code}`].filter(Boolean).join(' · ')}
        </p>

        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>Ampla concorrência{edition ? ` · ${edition}` : ''}</dt>
            <dd>{formatScore(ampla?.cutoff)}</dd>
          </div>
          {ampla ? (
            <div className={styles.stat}>
              <dt>Tipo de referência</dt>
              <dd>{REFERENCE_TYPE_LABEL[ampla.referenceType]}</dd>
            </div>
          ) : null}
          <div className={styles.stat}>
            <dt>Modalidades{edition ? ` · ${edition}` : ''}</dt>
            <dd>{editionReferences.length}</dd>
          </div>
        </dl>

        <div className={styles.heroActions}>
          <Link className={styles.cta} href={`/?courseCode=${course.code}`}>
            Simular com as minhas notas do ENEM
          </Link>
        </div>
      </section>

      {editionReferences.length > 0 ? (
        <section className={styles.card} aria-labelledby="modalidades">
          <h2 id="modalidades">Nota de corte por modalidade no SISU {edition}</h2>
          <p>
            Referências de {course.name}{place ? ` em ${place}` : ''} disponíveis na base XTRI para a edição {edition}
            {capturedAt ? `, capturadas em ${capturedAt}` : ''}.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Modalidade</th>
                  <th scope="col" className={styles.num}>Nota de corte</th>
                </tr>
              </thead>
              <tbody>
                {editionReferences.map(reference => (
                  <tr key={`${reference.modalityId}-${reference.modalityOfficialName}`}>
                    <th scope="row">{reference.modalityOfficialName}</th>
                    <td className={styles.num}>{formatScore(reference.cutoff)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className={styles.card}>
          <h2>Nota de corte</h2>
          <p>Ainda não há referência de nota de corte deste curso na base XTRI.</p>
        </section>
      )}

      {latestWeights ? (
        <section className={styles.card} aria-labelledby="pesos">
          <h2 id="pesos">Pesos e notas mínimas do ENEM ({latestWeights.year})</h2>
          <p>
            A nota ponderada do candidato é a média das cinco provas com estes pesos. Quem fica abaixo de uma nota mínima não concorre à vaga.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Prova</th>
                  <th scope="col" className={styles.num}>Peso</th>
                  <th scope="col" className={styles.num}>Nota mínima</th>
                </tr>
              </thead>
              <tbody>
                {WEIGHT_ROWS.map(([label, weightKey, minimumKey]) => (
                  <tr key={weightKey}>
                    <th scope="row">{label}</th>
                    <td className={styles.num}>{formatNumber(latestWeights[weightKey])}</td>
                    <td className={styles.num}>{formatMinimum(latestWeights[minimumKey])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {latestWeights.min_enem !== null ? (
            <p className={styles.muted}>
              {isRealMinimum(latestWeights.min_enem)
                ? `Média mínima no ENEM: ${formatNumber(latestWeights.min_enem)}.`
                : 'Sem média mínima no ENEM.'}
            </p>
          ) : null}
        </section>
      ) : null}

      {history.length > 1 ? (
        <section className={styles.card} aria-labelledby="historico">
          <h2 id="historico">Histórico da nota de corte na ampla concorrência</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Edição do SISU</th>
                  <th scope="col" className={styles.num}>Nota de corte</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => (
                  <tr key={row.edition}>
                    <th scope="row">{row.edition}</th>
                    <td className={styles.num}>{formatScore(row.cutoff)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {answers.faq.length > 0 ? (
        <section className={styles.card} aria-labelledby="perguntas">
          <h2 id="perguntas">Perguntas frequentes</h2>
          <dl className={styles.faq}>
            {answers.faq.map(item => (
              <div key={item.question}>
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className={styles.card}>
        <h2>De onde vêm estes números</h2>
        <p>
          As referências foram importadas e armazenadas pela XTRI, com a edição e a modalidade indicadas. A fonte oficial do SISU é{' '}
          <a className={styles.link} href="https://sisu.mec.gov.br/vagas" target="_blank" rel="noopener noreferrer">sisu.mec.gov.br</a>
          ; confira sempre o edital e o portal oficial antes de se inscrever.
        </p>
        {course.university ? (
          <p>
            <Link className={styles.link} href={universityPath(course.university)}>
              Ver todos os cursos de {institution ?? course.university} no SISU
            </Link>
          </p>
        ) : null}
      </section>
    </SeoShell>
  )
}
