import type { MetadataRoute } from 'next'
import { cacheLife } from 'next/cache'
import { listServiceSlugs } from '@/lib/catalog/service-page'
import { siteConfig } from '@/lib/config/site'

/**
 * Les pages légales (politique de confidentialité, mentions légales,
 * conditions générales) restent accessibles et indexables, mais sont
 * volontairement absentes du sitemap : elles n'ont pas leur place dans
 * le budget de crawl, au profit des pages qui font vraiment venir du monde.
 *
 * Mis en cache pour rester prérendu : sans cela, le `new Date()` de
 * `lastModified` rendrait la route dynamique et chaque passage de robot
 * déclencherait une invocation.
 */
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  'use cache'
  cacheLife('days')

  const lastModified = new Date()
  const slugs = await listServiceSlugs()

  return [
    {
      url: siteConfig.url,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${siteConfig.url}/reservation`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/prestations`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/institut`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: `${siteConfig.url}/contact`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    // Une page par soin : c'est là que vit le contenu qui fait venir du monde
    // — « épilation laser Bulle », « microblading Bulle ». Le catalogue est
    // déjà en cache, l'énumération ne coûte aucune requête de plus.
    ...slugs.map(slug => ({
      url: `${siteConfig.url}/prestations/${slug}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}

export default sitemap
