import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-card'
import { staticOgPage } from '@/lib/og-pages'

const page = staticOgPage(
  'Política de privacidade e cookies',
  'privacidade',
  'XTRI SISU · LGPD',
  'Sem cadastro, notas do ENEM processadas no seu navegador e nenhum cookie de rastreamento',
)

export const alt = page.alt
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image(): Promise<Response> {
  return renderOgCard(page.card)
}
