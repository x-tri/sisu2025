import type { MetadataRoute } from 'next'

import { loadCourseCatalog } from '@/lib/course-page-data'
import { coursePath, groupCoursesByUniversity } from '@/lib/course-seo'

const SITE_URL = 'https://xtrisisu.com'

// Generated on demand so the course list never depends on the build reaching the database.
export const dynamic = 'force-dynamic'

const corePages: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const courses = await loadCourseCatalog()

    return [
      ...corePages,
      { url: `${SITE_URL}/universidades`, changeFrequency: 'weekly', priority: 0.8 },
      ...groupCoursesByUniversity(courses).map(university => ({
        url: `${SITE_URL}/universidade/${university.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...courses.map(course => ({
        url: `${SITE_URL}${coursePath(course)}`,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ]
  } catch {
    return corePages
  }
}
