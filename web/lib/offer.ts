export const OFFER_BADGE = 'PLATAFORMA XTRI · ENEM 2027'
export const OFFER_TITLE = '17 simulados autorais do Xandão, com correção TRI'
export const OFFER_PRICE = '12x de R$ 59,90'
export const OFFER_SUBTITLE = 'Treine com a mesma nota que o ENEM usa e saiba o que estudar para subir.'
export const OFFER_CTA = 'Quero os simulados'
export const OFFER_HEADER_LABEL = 'Plataforma'

export type OfferPosition = 'home_topo' | 'curso' | 'universidade' | 'header'

const OFFER_BASE_URL = 'https://app.xtri.online/assinatura'

export function offerUrl(position: OfferPosition): string {
  const params = new URLSearchParams({
    utm_source: 'xtrisisu',
    utm_medium: 'site',
    utm_campaign: 'oferta_plataforma',
    utm_content: position,
  })
  return `${OFFER_BASE_URL}?${params.toString()}`
}

type GtagFn = (command: 'event', name: string, params: Record<string, string>) => void

export function trackOfferClick(position: OfferPosition): void {
  if (typeof window === 'undefined') return
  const { gtag } = window as unknown as { gtag?: GtagFn }
  if (typeof gtag !== 'function') return
  try {
    gtag('event', 'cta_plataforma_click', { origem: 'xtrisisu', posicao: position })
  } catch {
    // analytics must never block navigation
  }
}
