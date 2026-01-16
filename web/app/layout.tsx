import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SISU 2025 - Simulador',
  description: 'Simulador de notas de corte do SISU',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
