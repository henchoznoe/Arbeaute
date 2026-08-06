import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/mes-rendez-vous'],
    },
    sitemap: 'https://arbeaute-bulle.ch/sitemap.xml',
  }
}
