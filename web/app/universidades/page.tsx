import type { Metadata } from 'next'
import Link from 'next/link'

import SeoShell, { type Crumb } from '@/components/seo/SeoShell'
import styles from '@/components/seo/SeoShell.module.css'
import { loadUniversities } from '@/lib/course-page-data'

// Rendered on demand: the build must not depend on the database being reachable.
export const dynamic = 'force-dynamic'

const PATH = '/universidades'
const CRUMBS: Crumb[] = [{ name: 'Simulador SISU', href: '/' }, { name: 'Universidades' }]
const DESCRIPTION =
  'Lista das universidades e institutos com cursos no SISU: escolha a instituição para ver a nota de corte, os pesos do ENEM e as notas mínimas de cada curso.'

export const metadata: Metadata = {
  title: 'Universidades do SISU: nota de corte por instituição',
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: 'Universidades do SISU: nota de corte por instituição', description: DESCRIPTION, url: PATH },
}

export default async function UniversitiesPage(): Promise<JSX.Element> {
  const universities = await loadUniversities()
  const totalCourses = universities.reduce((total, university) => total + university.courses.length, 0)
  const count = new Intl.NumberFormat('pt-BR')

  return (
    <SeoShell crumbs={CRUMBS} currentPath={PATH}>
      <section className={styles.hero}>
        <h1>Universidades do SISU</h1>
        <p className={styles.heroMeta}>
          {count.format(universities.length)} instituições e {count.format(totalCourses)} cursos na base XTRI. Escolha uma instituição para ver a nota de corte de cada curso.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="instituicoes">
        <h2 id="instituicoes">Instituições em ordem alfabética</h2>
        <ul className={styles.linkList}>
          {universities.map(university => (
            <li key={university.slug}>
              <Link className={styles.link} href={`/universidade/${university.slug}`}>
                {university.acronym ? `${university.acronym} — ` : ''}{university.name}
              </Link>
              <span className={styles.muted}>
                {' '}· {count.format(university.courses.length)} {university.courses.length === 1 ? 'curso' : 'cursos'}
                {university.states.length > 0 ? ` · ${university.states.join(', ')}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </SeoShell>
  )
}
