import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-card'
import { staticOgPage } from '@/lib/og-pages'

const page = staticOgPage(
  'Consigo passar em Medicina?',
  'Medicina?',
  'SIMULADOR SISU 2027 · MEDICINA',
  'Nota de corte de Medicina por universidade e estado, com os pesos de cada curso',
)

export const alt = page.alt
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image(): Promise<Response> {
  return renderOgCard(page.card)
}
