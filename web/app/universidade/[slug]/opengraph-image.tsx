import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-card'
import { universityOgPage } from '@/lib/og-pages'

interface ImageProps {
  params: { slug: string }
}

export async function generateImageMetadata({ params }: ImageProps) {
  const { alt } = await universityOgPage(params.slug)
  return [{ id: 'og', alt, size: OG_SIZE, contentType: OG_CONTENT_TYPE }]
}

export default async function Image({ params }: ImageProps): Promise<Response> {
  return renderOgCard((await universityOgPage(params.slug)).card)
}
