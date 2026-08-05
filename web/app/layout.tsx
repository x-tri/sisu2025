import type { Metadata } from 'next'
import './globals.css'

import { ScoreProvider } from '../context/ScoreContext'
import { ModalityProvider } from '../context/ModalityContext'

export const metadata: Metadata = {
  title: 'XTRI SISU — referências verificáveis',
  description: 'Compare suas notas do ENEM com referências do SISU, com modalidade, edição e origem dos dados claramente identificadas.',
  icons: {
    icon: '/favicon.png',
    apple: '/xtri-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
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
