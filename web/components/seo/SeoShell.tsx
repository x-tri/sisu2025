import Link from 'next/link'
import type { ReactNode } from 'react'

import styles from './SeoShell.module.css'

export interface Crumb {
  name: string
  href?: string
}

const SITE_URL = 'https://xtrisisu.com'

export function breadcrumbJsonLd(crumbs: Crumb[], currentPath: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.href ?? currentPath}`,
    })),
  }
}

interface SeoShellProps {
  crumbs: Crumb[]
  currentPath: string
  children: ReactNode
}

/** Static chrome for the public reference pages (course, university, index). */
export default function SeoShell({ crumbs, currentPath, children }: SeoShellProps): JSX.Element {
  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs, currentPath)) }}
      />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="XTRI SISU — início">
            <img src="/xtri-logo.png" alt="" />
            <span><strong>XTRI</strong> SISU</span>
          </Link>
          <Link className={styles.headerCta} href="/">Simular minhas notas</Link>
        </div>
      </header>

      <main className={styles.main}>
        <nav className={styles.crumbs} aria-label="Você está em">
          <ol>
            {crumbs.map(crumb => (
              <li key={crumb.href ?? 'current'}>
                {crumb.href
                  ? <Link href={crumb.href}>{crumb.name}</Link>
                  : <span aria-current="page">{crumb.name}</span>}
              </li>
            ))}
          </ol>
        </nav>
        {children}
      </main>

      <footer className={styles.footer}>
        <p>
          Referências importadas e armazenadas pela XTRI. Fonte oficial:{' '}
          <a href="https://sisu.mec.gov.br/vagas" target="_blank" rel="noopener noreferrer">sisu.mec.gov.br</a>.
        </p>
        <p>
          <Link href="/universidades">Universidades</Link>
          {' · '}
          <a href="https://xtri.online" target="_blank" rel="noopener noreferrer">XTRI</a>
          {' · '}
          <a href="https://rankingenem.com" target="_blank" rel="noopener noreferrer">Ranking ENEM por escola</a>
        </p>
      </footer>
    </div>
  )
}
