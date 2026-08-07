import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/config/site'

/**
 * Les pages légales (politique de confidentialité, mentions légales,
 * conditions générales) restent accessibles et indexables, mais sont
 * volontairement absentes du sitemap : elles n'ont pas leur place dans
 * le budget de crawl, au profit des pages qui font vraiment venir des
 * clientes.
 */
const sitemap = (): MetadataRoute.Sitemap => [
  {
    url: siteConfig.url,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 1,
  },
  {
    url: `${siteConfig.url}/reservation`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  },
]

export default sitemap
