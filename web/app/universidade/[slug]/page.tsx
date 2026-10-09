import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import SeoShell, { type Crumb } from '@/components/seo/SeoShell'
import styles from '@/components/seo/SeoShell.module.css'
import { loadUniversities } from '@/lib/course-page-data'
import { coursePath, type UniversityGroup } from '@/lib/course-seo'

interface PageProps {
  params: { slug: string }
}

async function findUniversity(slug: string): Promise<UniversityGroup | null> {
  return (await loadUniversities()).find(university => university.slug === slug) ?? null
}

function shortName(university: UniversityGroup): string {
  return university.acronym ?? university.name
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const university = await findUniversity(params.slug)
  if (!university) return { title: 'Instituição não encontrada', robots: { index: false, follow: true } }

  const label = university.acronym ? `${university.acronym} (${university.name})` : university.name
  const title = `Notas de corte ${shortName(university)} no SISU: todos os cursos`
  const description = `${university.courses.length} ${university.courses.length === 1 ? 'curso' : 'cursos'} de ${label} no SISU, com nota de corte por modalidade, pesos do ENEM e notas mínimas.`
  const canonical = `/universidade/${university.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website', locale: 'pt_BR' },
  }
}

export default async function UniversityPage({ params }: PageProps): Promise<JSX.Element> {
  const university = await findUniversity(params.slug)
  if (!university) notFound()

  const path = `/universidade/${university.slug}`
  const crumbs: Crumb[] = [
    { name: 'Simulador SISU', href: '/' },
    { name: 'Universidades', href: '/universidades' },
    { name: shortName(university) },
  ]
  const cities = Array.from(new Set(university.courses.map(course => course.city).filter(Boolean)))

  return (
    <SeoShell crumbs={crumbs} currentPath={path}>
      <section className={styles.hero}>
        <h1>Notas de corte {shortName(university)} no SISU</h1>
        <p className={styles.heroMeta}>
          {university.name}
          {university.states.length > 0 ? ` · ${university.states.join(', ')}` : ''}
        </p>
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>Cursos no SISU</dt>
            <dd>{new Intl.NumberFormat('pt-BR').format(university.courses.length)}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Cidades</dt>
            <dd>{cities.length}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="cursos">
        <h2 id="cursos">Cursos de {shortName(university)} no SISU</h2>
        <p>Abra um curso para ver a nota de corte por modalidade, os pesos do ENEM e as notas mínimas.</p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Curso</th>
                <th scope="col">Cidade</th>
                <th scope="col">Grau</th>
                <th scope="col">Turno</th>
              </tr>
            </thead>
            <tbody>
              {university.courses.map(course => (
                <tr key={course.code}>
                  <th scope="row">
                    <Link className={styles.link} href={coursePath(course)}>{course.name}</Link>
                  </th>
                  <td>{[course.city, course.state].filter(Boolean).join('/') || '—'}</td>
                  <td>{course.degree ?? '—'}</td>
                  <td>{course.schedule ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SeoShell>
  )
}
