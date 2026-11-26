import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-card'
import { staticOgPage } from '@/lib/og-pages'

const page = staticOgPage(
  'Consigo passar no SISU?',
  'SISU?',
  'SIMULADOR SISU 2027 · GRÁTIS',
  'Nota de corte por curso, universidade e modalidade, com os pesos de cada curso',
)

export const alt = page.alt
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image(): Promise<Response> {
  return renderOgCard(page.card)
}
