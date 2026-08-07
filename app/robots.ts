import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/config/site'
import { env } from '@/lib/core/env'

/**
 * Seul le déploiement de production doit être indexable : les
 * previews Vercel ont une URL générée à chaque déploiement et ne
 * doivent jamais apparaître dans les résultats de recherche.
 */
export const isProductionDeployment = (environment?: string): boolean =>
  environment === 'production'

const robots = (): MetadataRoute.Robots => {
  if (!isProductionDeployment(env.VERCEL_ENV))
    return { rules: [{ userAgent: '*', disallow: '/' }] }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/mes-rendez-vous'],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  }
}

export default robots
