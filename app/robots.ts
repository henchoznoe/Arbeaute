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

export const createRobots = (environment?: string): MetadataRoute.Robots => {
  if (!isProductionDeployment(environment))
    return { rules: [{ userAgent: '*', disallow: '/' }] }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  }
}

const robots = (): MetadataRoute.Robots => createRobots(env.VERCEL_ENV)

export default robots
