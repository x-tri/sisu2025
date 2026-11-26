import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

import { serializeJsonLd } from '@/lib/course-seo'

import { ScoreProvider } from '../context/ScoreContext'
import { ModalityProvider } from '../context/ModalityContext'

const bigShoulders = localFont({
  src: [
    { path: '../assets/fonts/BigShouldersDisplay-ExtraBold.ttf', weight: '800' },
    { path: '../assets/fonts/BigShouldersDisplay-Black.ttf', weight: '900' },
  ],
  variable: '--font-big-shoulders',
  display: 'swap',
})

const jetbrainsMono = localFont({
  src: '../assets/fonts/JetBrainsMono-Medium.ttf',
  weight: '500',
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const SITE_URL = 'https://xtrisisu.com'
const SITE_TITLE = 'Simulador SISU 2027 grátis: nota de corte e calculadora com pesos'
const SITE_DESCRIPTION =
  'Simulador SISU 2027 grátis e sem cadastro: calcule sua nota ponderada do ENEM com os pesos de cada curso e compare com a nota de corte por universidade e modalidade, incluindo Medicina.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_TITLE} | XTRI SISU`,
    template: '%s | XTRI SISU',
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: 'XTRI SISU',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
  alternateName: ['Simulador SISU XTRI', 'Calculadora SISU XTRI'],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  inLanguage: 'pt-BR',
  isAccessibleForFree: true,
  featureList: [
    'Calculadora de nota ponderada do ENEM com os pesos de cada curso',
    'Nota de corte do SISU por universidade e modalidade',
    'Simulador SISU para Medicina',
  ],
  publisher: { '@type': 'Organization', name: 'XTRI', url: 'https://xtri.online' },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${bigShoulders.variable} ${jetbrainsMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
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
