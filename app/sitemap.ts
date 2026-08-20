import type { MetadataRoute } from 'next'
import { cacheLife } from 'next/cache'
import { getPublicServiceSitemapEntries } from '@/lib/catalog/queries'
import { siteConfig } from '@/lib/config/site'

/**
 * Les pages légales (politique de confidentialité, mentions légales,
 * conditions générales) restent accessibles et indexables, mais sont
 * volontairement absentes du sitemap : elles n'ont pas leur place dans
 * le budget de crawl, au profit des pages qui font vraiment venir du monde.
 *
 * Les pages fixes n'annoncent pas de date artificielle : Google demande que
 * `lastModified` corresponde à une modification significative du contenu.
 * Les soins reprennent en revanche la date réelle du catalogue, invalidée par
 * le même tag lors d'une modification dans l'administration.
 */
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  'use cache'
  cacheLife('days')

  const services = await getPublicServiceSitemapEntries()

  return [
    { url: siteConfig.url },
    { url: `${siteConfig.url}/reservation` },
    { url: `${siteConfig.url}/prestations` },
    { url: `${siteConfig.url}/institut` },
    { url: `${siteConfig.url}/contact` },
    // Une page par soin : c'est là que vit le contenu qui fait venir du monde
    // — « épilation laser Bulle », « microblading Bulle ».
    ...services.map(service => ({
      url: `${siteConfig.url}/prestations/${service.slug}`,
      lastModified: service.lastModified,
    })),
  ]
}

export default sitemap
