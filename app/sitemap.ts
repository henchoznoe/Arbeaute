import type { MetadataRoute } from 'next'
import { cacheLife } from 'next/cache'
import { siteConfig } from '@/lib/config/site'

/**
 * Les pages légales (politique de confidentialité, mentions légales,
 * conditions générales) restent accessibles et indexables, mais sont
 * volontairement absentes du sitemap : elles n'ont pas leur place dans
 * le budget de crawl, au profit des pages qui font vraiment venir des
 * clientes.
 *
 * Mis en cache pour rester prérendu : sans cela, le `new Date()` de
 * `lastModified` rendrait la route dynamique et chaque passage de robot
 * déclencherait une invocation.
 */
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  'use cache'
  cacheLife('days')

  const lastModified = new Date()

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
  ]
}

export default sitemap
