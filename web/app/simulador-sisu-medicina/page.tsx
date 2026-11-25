import type { Metadata } from 'next'
import Link from 'next/link'

import SeoShell, { type Crumb } from '@/components/seo/SeoShell'
import styles from '@/components/seo/SeoShell.module.css'
import { faqJsonLd } from '@/lib/course-faq'
import { loadMedicineOffers } from '@/lib/course-page-data'
import { coursePath, formatScore, institutionLabel, serializeJsonLd } from '@/lib/course-seo'
import {
  MEDICINE_HUB_PATH,
  groupMedicineByUniversity,
  medicineHubFaq,
  medicineUniversityPath,
  offerPlace,
  rankMedicineOffers,
  summarizeMedicine,
  summarizeMedicineByState,
  type MedicineOffer,
} from '@/lib/medicine-seo'

export const dynamic = 'force-dynamic'

const SITE_URL = 'https://xtrisisu.com'
const TITLE = 'Simulador SISU Medicina 2027: nota de corte de Medicina por universidade'
const DESCRIPTION = 'Simule sua nota do ENEM para Medicina no SISU 2027. Veja as maiores e menores notas de corte de Medicina por universidade e estado, com pesos e modalidade.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: MEDICINE_HUB_PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: MEDICINE_HUB_PATH, type: 'website', locale: 'pt_BR' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const integer = new Intl.NumberFormat('pt-BR')

async function safeLoadOffers(): Promise<MedicineOffer[] | null> {
  try {
    return await loadMedicineOffers()
  } catch {
    return null
  }
}

function RankingTable({ offers, caption }: { offers: MedicineOffer[]; caption: string }): JSX.Element {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Instituição</th>
            <th scope="col">Cidade</th>
            <th scope="col" className={styles.num}>Nota de corte</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer, index) => (
            <tr key={offer.course.code}>
              <td>{index + 1}º</td>
              <th scope="row">
                <Link className={styles.link} href={coursePath(offer.course)}>
                  {institutionLabel(offer.course.university) ?? 'Instituição'}
                </Link>
                {offer.course.schedule ? <span className={styles.muted}> · {offer.course.schedule}</span> : null}
              </th>
              <td>{offerPlace(offer) || '—'}</td>
              <td className={styles.num}>{formatScore(offer.cutoff)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function MedicineHubPage(): Promise<JSX.Element> {
  const offers = await safeLoadOffers()
  const crumbs: Crumb[] = [
    { name: 'Simulador SISU', href: '/' },
    { name: 'Simulador SISU Medicina' },
  ]

  const list = offers ?? []
  const summary = summarizeMedicine(list)
  const { edition } = summary
  const highest = rankMedicineOffers(list, edition, 'highest', 10)
  const lowest = rankMedicineOffers(list, edition, 'lowest', 10)
  const states = summarizeMedicineByState(list, edition)
  const universities = groupMedicineByUniversity(list)
  const faq = medicineHubFaq(summary)

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Nota de corte de Medicina no SISU por instituição',
    itemListElement: universities.map((university, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `Nota de corte Medicina ${university.label}`,
      url: `${SITE_URL}${medicineUniversityPath(university.slug)}`,
    })),
  }

  return (
    <SeoShell crumbs={crumbs} currentPath={MEDICINE_HUB_PATH}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd(faq)) }} />
      {universities.length > 0 ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemList) }} />
      ) : null}

      <section className={styles.hero}>
        <h1>Simulador SISU Medicina 2027</h1>
        <p className={styles.heroLead}>
          {summary.lowest && summary.highest && edition !== null
            ? `No SISU ${edition}, as notas de corte de Medicina na ampla concorrência foram de ${formatScore(summary.lowest.cutoff)} a ${formatScore(summary.highest.cutoff)}. Compare sua nota ponderada do ENEM com cada universidade e monte seu plano para o SISU 2027.`
            : 'Compare sua nota ponderada do ENEM com as notas de corte de Medicina de cada universidade e monte seu plano para o SISU 2027.'}
        </p>
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>Ofertas de Medicina</dt>
            <dd>{summary.totalOffers > 0 ? integer.format(summary.totalOffers) : '—'}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Instituições</dt>
            <dd>{summary.totalUniversities > 0 ? integer.format(summary.totalUniversities) : '—'}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Menor nota de corte</dt>
            <dd>{summary.lowest ? formatScore(summary.lowest.cutoff) : '—'}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Maior nota de corte</dt>
            <dd>{summary.highest ? formatScore(summary.highest.cutoff) : '—'}</dd>
          </div>
        </dl>
        <div className={styles.heroActions}>
          <Link className={styles.cta} href="/">Simular Medicina com as minhas notas</Link>
        </div>
      </section>

      {offers === null ? (
        <section className={styles.card} aria-labelledby="indisponivel">
          <h2 id="indisponivel">Notas de corte temporariamente indisponíveis</h2>
          <p>Não foi possível carregar as notas de corte agora. O simulador continua funcionando na página inicial.</p>
        </section>
      ) : null}

      {lowest.length > 0 ? (
        <section className={styles.card} aria-labelledby="menores">
          <h2 id="menores">Menores notas de corte de Medicina no SISU {edition}</h2>
          <p>Ampla concorrência. Notas de corte mais baixas indicam onde a concorrência foi menor naquela edição.</p>
          <RankingTable offers={lowest} caption={`Menores notas de corte de Medicina no SISU ${edition}`} />
        </section>
      ) : null}

      {highest.length > 0 ? (
        <section className={styles.card} aria-labelledby="maiores">
          <h2 id="maiores">Maiores notas de corte de Medicina no SISU {edition}</h2>
          <p>Ampla concorrência, a mesma edição usada no ranking acima.</p>
          <RankingTable offers={highest} caption={`Maiores notas de corte de Medicina no SISU ${edition}`} />
        </section>
      ) : null}

      {states.length > 0 ? (
        <section className={styles.card} aria-labelledby="estados">
          <h2 id="estados">Nota de corte de Medicina por estado</h2>
          <p>Menor e maior nota de corte da ampla concorrência em cada estado no SISU {edition ?? ''}.</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Estado</th>
                  <th scope="col" className={styles.num}>Ofertas</th>
                  <th scope="col" className={styles.num}>Menor</th>
                  <th scope="col" className={styles.num}>Maior</th>
                </tr>
              </thead>
              <tbody>
                {states.map(state => (
                  <tr key={state.state}>
                    <th scope="row">{state.state}</th>
                    <td className={styles.num}>{state.offers}</td>
                    <td className={styles.num}>{state.lowest ? formatScore(state.lowest.cutoff) : '—'}</td>
                    <td className={styles.num}>{state.highest ? formatScore(state.highest.cutoff) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {universities.length > 0 ? (
        <section className={styles.card} aria-labelledby="universidades">
          <h2 id="universidades">Nota de corte de Medicina por universidade</h2>
          <p>Escolha a instituição para ver todas as ofertas de Medicina, cidades, turnos e notas de corte.</p>
          <ul className={styles.linkList}>
            {universities.map(university => (
              <li key={university.slug}>
                <Link className={styles.link} href={medicineUniversityPath(university.slug)}>
                  Medicina {university.label}
                </Link>
                <span className={styles.muted}> · {university.states.join(', ')}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.card} aria-labelledby="como-funciona">
        <h2 id="como-funciona">Como funciona o simulador SISU para Medicina</h2>
        <p>
          Cada universidade define pesos diferentes para Redação, Linguagens, Matemática, Ciências Humanas e Ciências da Natureza.
          O simulador XTRI SISU calcula sua nota ponderada com os pesos de cada oferta e compara com a nota de corte da modalidade
          escolhida, mostrando quantos pontos faltam em cada área.
        </p>
        <div className={styles.heroActions}>
          <Link className={styles.cta} href="/">Abrir o simulador SISU</Link>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="perguntas">
        <h2 id="perguntas">Perguntas frequentes sobre Medicina no SISU</h2>
        <dl className={styles.faq}>
          {faq.map(item => (
            <div key={item.question}>
              <dt>{item.question}</dt>
              <dd>{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </SeoShell>
  )
}
