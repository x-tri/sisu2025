import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import SeoShell, { type Crumb } from '@/components/seo/SeoShell'
import styles from '@/components/seo/SeoShell.module.css'
import { atInstitution, faqJsonLd } from '@/lib/course-faq'
import { loadMedicineOffers } from '@/lib/course-page-data'
import { coursePath, formatScore, serializeJsonLd, universityPath } from '@/lib/course-seo'
import {
  MEDICINE_HUB_PATH,
  groupMedicineByUniversity,
  medicineUniversityFaq,
  medicineUniversityPath,
  offerPlace,
  rankingEdition,
  rankMedicineOffers,
  type MedicineUniversity,
} from '@/lib/medicine-seo'

interface PageProps {
  params: { slug: string }
}

async function findMedicineUniversity(slug: string): Promise<MedicineUniversity | null> {
  return groupMedicineByUniversity(await loadMedicineOffers()).find(university => university.slug === slug) ?? null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const university = await findMedicineUniversity(params.slug)
  if (!university) return { title: 'Oferta de Medicina não encontrada', robots: { index: false, follow: true } }

  const edition = rankingEdition(university.offers)
  const title = `Nota de corte Medicina ${university.label} no SISU${edition ? ` ${edition}` : ''}`
  const lowest = rankMedicineOffers(university.offers, edition, 'lowest', 1)[0]
  const description = lowest
    ? `Nota de corte de Medicina ${atInstitution(university.name)}: ${formatScore(lowest.cutoff)} na ampla concorrência do SISU ${edition}. Simule sua nota do ENEM com os pesos da instituição.`
    : `Medicina em ${university.name} no SISU: ofertas, cidades e simulador de nota do ENEM com os pesos da instituição.`
  const canonical = medicineUniversityPath(university.slug)

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website', locale: 'pt_BR' },
  }
}

export default async function MedicineUniversityPage({ params }: PageProps): Promise<JSX.Element> {
  const university = await findMedicineUniversity(params.slug)
  if (!university) notFound()

  const path = medicineUniversityPath(university.slug)
  const crumbs: Crumb[] = [
    { name: 'Simulador SISU', href: '/' },
    { name: 'Medicina', href: MEDICINE_HUB_PATH },
    { name: university.label },
  ]
  const edition = rankingEdition(university.offers)
  const ranked = rankMedicineOffers(university.offers, edition, 'lowest', university.offers.length)
  const faq = medicineUniversityFaq(university)
  const [first] = university.offers

  return (
    <SeoShell crumbs={crumbs} currentPath={path}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd(faq)) }} />

      <section className={styles.hero}>
        <h1>Nota de corte Medicina {university.label}{edition ? ` no SISU ${edition}` : ''}</h1>
        <p className={styles.heroMeta}>
          {university.name}
          {university.states.length > 0 ? ` · ${university.states.join(', ')}` : ''}
        </p>
        {faq[0] ? <p className={styles.heroLead}>{faq[0].answer}</p> : null}
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>Ofertas de Medicina</dt>
            <dd>{university.offers.length}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Menor nota de corte</dt>
            <dd>{ranked[0] ? formatScore(ranked[0].cutoff) : '—'}</dd>
          </div>
          {ranked.length > 1 ? (
            <div className={styles.stat}>
              <dt>Maior nota de corte</dt>
              <dd>{formatScore(ranked[ranked.length - 1].cutoff)}</dd>
            </div>
          ) : null}
        </dl>
        {first ? (
          <div className={styles.heroActions}>
            <Link className={styles.cta} href={`/?courseCode=${first.course.code}`}>
              Simular Medicina {university.label} com as minhas notas
            </Link>
          </div>
        ) : null}
      </section>

      <section className={styles.card} aria-labelledby="ofertas">
        <h2 id="ofertas">Ofertas de Medicina {university.label} no SISU</h2>
        <p>Ampla concorrência{edition ? `, SISU ${edition}` : ''}. Abra uma oferta para ver as notas de corte de todas as modalidades, os pesos do ENEM e as notas mínimas.</p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Cidade</th>
                <th scope="col">Turno</th>
                <th scope="col" className={styles.num}>Nota de corte</th>
                <th scope="col">Simular</th>
              </tr>
            </thead>
            <tbody>
              {university.offers.map(offer => (
                <tr key={offer.course.code}>
                  <th scope="row">
                    <Link className={styles.link} href={coursePath(offer.course)}>
                      {offerPlace(offer) || 'Campus principal'}
                    </Link>
                  </th>
                  <td>{offer.course.schedule ?? '—'}</td>
                  <td className={styles.num}>
                    {formatScore(offer.cutoff)}
                    {offer.edition && offer.edition !== edition ? <span className={styles.muted}> (SISU {offer.edition})</span> : null}
                  </td>
                  <td>
                    <Link className={styles.link} href={`/?courseCode=${offer.course.code}`}>
                      Simular
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="perguntas">
        <h2 id="perguntas">Perguntas frequentes sobre Medicina {university.label}</h2>
        <dl className={styles.faq}>
          {faq.map(item => (
            <div key={item.question}>
              <dt>{item.question}</dt>
              <dd>{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="mais">
        <h2 id="mais">Veja também</h2>
        <ul className={styles.linkList}>
          <li><Link className={styles.link} href={MEDICINE_HUB_PATH}>Nota de corte de Medicina em todas as universidades</Link></li>
          <li><Link className={styles.link} href={universityPath(university.name)}>Todos os cursos {university.label} no SISU</Link></li>
          <li><Link className={styles.link} href="/">Simulador SISU 2027 com as minhas notas</Link></li>
        </ul>
      </section>
    </SeoShell>
  )
}
