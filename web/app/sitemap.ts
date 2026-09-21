import type { MetadataRoute } from 'next'

// Course URLs are redirects into the simulator, so only the simulator itself is listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://xtrisisu.com/',
      changeFrequency: 'daily',
      priority: 1,
    },
  ]
}
