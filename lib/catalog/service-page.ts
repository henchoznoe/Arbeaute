import { type CatalogCategory, getPublicCatalog } from '@/lib/catalog/queries'

/**
 * Une prestation retrouvée par son adresse, avec son groupe.
 *
 * Aucune requête dédiée : `getPublicCatalog()` est déjà en cache sous
 * `CATALOG_TAG` et sert la page d'accueil comme le catalogue. Interroger la
 * base par `slug` ajouterait une lecture non cachée par page de soin, et ferait
 * glisser la route hors du prérendu — pour retrouver exactement ce qui est déjà
 * chargé.
 */

type CatalogService = CatalogCategory['services'][number]

export interface ServicePageData {
  service: CatalogService
  category: Pick<CatalogCategory, 'id' | 'name' | 'color'>
  /** Les autres soins du même groupe, pour proposer une suite. */
  siblings: CatalogService[]
}

/**
 * Cache Components exige au moins une adresse pour valider une route
 * dynamique. Les traits de soulignement rendent celle-ci impossible à créer
 * depuis l'administration, dont les adresses n'utilisent que lettres, chiffres
 * et tirets.
 */
export const SERVICE_PAGE_VALIDATION_SLUG = '__catalogue-vide__'

export const buildServiceStaticParams = (slugs: string[]): { slug: string }[] =>
  (slugs.length > 0 ? slugs : [SERVICE_PAGE_VALIDATION_SLUG]).map(slug => ({
    slug,
  }))

export const findServiceBySlug = async (
  slug: string,
): Promise<ServicePageData | null> => {
  const categories = await getPublicCatalog()

  for (const category of categories) {
    const service = category.services.find(item => item.slug === slug)
    if (!service) continue

    return {
      service,
      category: {
        id: category.id,
        name: category.name,
        color: category.color,
      },
      siblings: category.services.filter(item => item.id !== service.id),
    }
  }

  return null
}

/** Toutes les adresses de prestations, pour le prérendu et le sitemap. */
export const listServiceSlugs = async (): Promise<string[]> => {
  const categories = await getPublicCatalog()
  return categories.flatMap(category =>
    category.services.map(service => service.slug),
  )
}
