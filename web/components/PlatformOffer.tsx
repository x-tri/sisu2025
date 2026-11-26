'use client'

import { ArrowRight } from 'lucide-react'
import {
  OFFER_BADGE,
  OFFER_CTA,
  OFFER_PRICE,
  OFFER_SUBTITLE,
  OFFER_TITLE,
  offerUrl,
  trackOfferClick,
  type OfferPosition,
} from '@/lib/offer'
import styles from './PlatformOffer.module.css'

interface PlatformOfferProps {
  position: Exclude<OfferPosition, 'header'>
  variant?: 'strip' | 'card'
}

export default function PlatformOffer({ position, variant = 'card' }: PlatformOfferProps) {
  return (
    <section
      className={`${styles.offer} ${variant === 'strip' ? styles.strip : styles.card}`}
      aria-labelledby={`offer-title-${position}`}
    >
      <div className={styles.copy}>
        <p className={styles.badge}>{OFFER_BADGE}</p>
        <h2 id={`offer-title-${position}`} className={styles.title}>{OFFER_TITLE}</h2>
        <p className={styles.subtitle}>{OFFER_SUBTITLE}</p>
      </div>
      <div className={styles.action}>
        <p className={styles.price}>{OFFER_PRICE}</p>
        <a
          className={styles.button}
          href={offerUrl(position)}
          target="_blank"
          rel="noopener"
          onClick={() => trackOfferClick(position)}
        >
          {OFFER_CTA} <ArrowRight size={18} aria-hidden="true" />
          <span className={styles.srOnly}> (abre em nova aba)</span>
        </a>
      </div>
    </section>
  )
}
