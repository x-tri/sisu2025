import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ImageResponse } from 'next/og'

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const NAVY = '#071a52'
const ORANGE = '#fd5430'
const ORANGE_TEXT = '#d8400f'
const SURFACE = '#efe4da'
const SURFACE_ALT = '#fbf6f1'
const INK_SECONDARY = '#5c544d'
const PAGE_PADDING = 64
const PANEL_WIDTH = 340
const TITLE_SIZES = [112, 96, 84, 72, 64, 56, 48]
const MAX_TITLE_LINES = 3
// Big Shoulders Display is condensed; this is its widest uppercase advance in em.
const TITLE_CHAR_EM = 0.46

export interface OgPanel {
  label: string
  value: string
  note?: string
}

export interface OgCardProps {
  kicker: string
  title: string
  /** Words of the title drawn in the highlight orange. */
  highlight?: string
  subtitle?: string
  panel?: OgPanel
}

const assetsDir = path.join(process.cwd(), 'assets')

const loadAssets = (() => {
  let cached: Promise<{ fonts: NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts']; mark: string }> | null = null
  return () => {
    cached ??= (async () => {
      const font = (file: string) => readFile(path.join(assetsDir, 'fonts', file))
      const [black, extraBold, regular, semiBold, mono, mark] = await Promise.all([
        font('BigShouldersDisplay-Black.ttf'),
        font('BigShouldersDisplay-ExtraBold.ttf'),
        font('Inter-Regular.ttf'),
        font('Inter-SemiBold.ttf'),
        font('JetBrainsMono-Medium.ttf'),
        readFile(path.join(assetsDir, 'xtri-mark.png')),
      ])
      return {
        fonts: [
          { name: 'Big Shoulders Display', data: extraBold, weight: 800 as const, style: 'normal' as const },
          { name: 'Big Shoulders Display', data: black, weight: 900 as const, style: 'normal' as const },
          { name: 'Inter', data: regular, weight: 400 as const, style: 'normal' as const },
          { name: 'Inter', data: semiBold, weight: 600 as const, style: 'normal' as const },
          { name: 'JetBrains Mono', data: mono, weight: 500 as const, style: 'normal' as const },
        ],
        mark: `data:image/png;base64,${mark.toString('base64')}`,
      }
    })().catch(error => {
      cached = null
      throw error
    })
    return cached
  }
})()

function wrapWords(words: string[], fontSize: number, maxWidth: number): string[][] {
  const maxChars = Math.max(1, Math.floor(maxWidth / (fontSize * TITLE_CHAR_EM)))
  const lines: string[][] = []
  let length = 0
  for (const word of words) {
    const current = lines[lines.length - 1]
    if (current && length + 1 + word.length <= maxChars) {
      current.push(word)
      length += 1 + word.length
    } else {
      lines.push([word])
      length = word.length
    }
  }
  return lines
}

/** Largest title size that fits in at most three lines, breaking only between words. */
function layoutTitle(title: string, maxWidth: number): { fontSize: number; lines: string[][] } {
  const words = title.toUpperCase().split(/\s+/).filter(Boolean)
  for (const fontSize of TITLE_SIZES) {
    const lines = wrapWords(words, fontSize, maxWidth)
    if (lines.length <= MAX_TITLE_LINES) return { fontSize, lines }
  }
  const fontSize = TITLE_SIZES[TITLE_SIZES.length - 1]
  return { fontSize, lines: wrapWords(words, fontSize, maxWidth) }
}

export async function renderOgCard({ kicker, title, highlight, subtitle, panel }: OgCardProps): Promise<ImageResponse> {
  const { fonts, mark } = await loadAssets()
  const textWidth = OG_SIZE.width - PAGE_PADDING * 2 - (panel ? PANEL_WIDTH + 48 : 0)
  const { fontSize, lines } = layoutTitle(title, textWidth)
  const highlighted = new Set((highlight ?? '').toUpperCase().split(/\s+/).filter(Boolean))

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: SURFACE,
          fontFamily: 'Inter',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', height: 12, width: '100%' }}>
          <div style={{ flex: 1, background: NAVY }} />
          <div style={{ flex: 1, background: ORANGE }} />
        </div>

        <img src={mark} width={78} height={78} alt="" style={{ position: 'absolute', top: 36, right: PAGE_PADDING }} />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: `44px ${PAGE_PADDING}px 40px`,
          }}
        >
          <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 24, color: INK_SECONDARY, letterSpacing: 2 }}>
            {kicker}
          </div>

          <div style={{ display: 'flex', flex: 1, alignItems: 'center', paddingTop: 56 }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: textWidth }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {lines.map((line, index) => (
                  <div key={index} style={{ display: 'flex', lineHeight: 1, fontFamily: 'Big Shoulders Display', fontWeight: 900, fontSize }}>
                    {line.map((word, wordIndex) => (
                      <span key={wordIndex} style={{ color: highlighted.has(word) ? ORANGE_TEXT : NAVY, marginRight: wordIndex < line.length - 1 ? fontSize * 0.22 : 0 }}>
                        {word}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              {subtitle ? (
                <div style={{ display: 'flex', marginTop: 28, fontSize: 30, lineHeight: 1.3, color: INK_SECONDARY, fontWeight: 400 }}>
                  {subtitle}
                </div>
              ) : null}
            </div>

            {panel ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  width: PANEL_WIDTH,
                  marginLeft: 48,
                  padding: '32px 36px',
                  background: SURFACE_ALT,
                  borderRadius: 28,
                  boxShadow: '0 8px 24px rgba(7, 26, 82, 0.12)',
                }}
              >
                <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 20, color: INK_SECONDARY, letterSpacing: 1 }}>
                  {panel.label}
                </div>
                <div style={{ display: 'flex', marginTop: 12, fontFamily: 'Big Shoulders Display', fontWeight: 900, fontSize: 96, lineHeight: 1, color: ORANGE_TEXT }}>
                  {panel.value}
                </div>
                {panel.note ? (
                  <div style={{ display: 'flex', marginTop: 12, fontSize: 24, fontWeight: 600, color: NAVY }}>{panel.note}</div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 24, color: INK_SECONDARY }}>
            xtrisisu.com
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  )
}
