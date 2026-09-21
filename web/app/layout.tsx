import type { Metadata } from 'next'
import './globals.css'

import { ScoreProvider } from '../context/ScoreContext'
import { ModalityProvider } from '../context/ModalityContext'

const SITE_URL = 'https://xtrisisu.com'
const SITE_DESCRIPTION =
  'Compare suas notas do ENEM com referências do SISU, com modalidade, edição e origem dos dados claramente identificadas.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Simulador SISU: nota de corte e nota ponderada do ENEM | XTRI SISU',
    template: '%s | XTRI SISU',
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: 'XTRI SISU',
    title: 'Simulador SISU: nota de corte e nota ponderada do ENEM',
    description: SITE_DESCRIPTION,
    images: [{ url: '/xtri-logo.png', width: 974, height: 1024, alt: 'XTRI SISU' }],
  },
  twitter: {
    card: 'summary',
    title: 'Simulador SISU: nota de corte e nota ponderada do ENEM',
    description: SITE_DESCRIPTION,
    images: ['/xtri-logo.png'],
  },
  icons: {
    icon: '/favicon.png',
    apple: '/xtri-logo.png',
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'XTRI SISU',
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  inLanguage: 'pt-BR',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <a href="#main-content" className="skip-link">
          Pular para conteúdo principal
        </a>
        <ScoreProvider>
          <ModalityProvider>
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
          </ModalityProvider>
        </ScoreProvider>
      </body>
    </html>
  )
}
