import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-card'
import { staticOgPage } from '@/lib/og-pages'

const page = staticOgPage(
  'Nota de corte por universidade',
  'universidade',
  'SISU 2027 · INSTITUIÇÕES',
  'Escolha a instituição e veja a nota de corte e os pesos do ENEM de cada curso',
)

export const alt = page.alt
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image(): Promise<Response> {
  return renderOgCard(page.card)
}
