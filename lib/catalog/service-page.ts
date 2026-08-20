import { type CatalogCategory, getPublicCatalog } from '@/lib/catalog/queries'
import { contact } from '@/lib/constants/contact'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import { formatPrice } from '@/lib/utils/format'

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

interface ServiceMetaDescriptionOptions {
  readonly serviceName: string
  readonly categoryName: string
  readonly description: string | null
  readonly durationMinutes: number
  readonly priceCents: number
  readonly priceNote: string | null
}

const META_DESCRIPTION_MAX_LENGTH = 160

const truncateMetaDescription = (description: string): string => {
  if (description.length <= META_DESCRIPTION_MAX_LENGTH) return description

  const shortened = description.slice(0, META_DESCRIPTION_MAX_LENGTH - 1)
  const lastSpace = shortened.lastIndexOf(' ')
  return `${shortened.slice(0, lastSpace)}…`
}

/** Description propre à chaque soin, concise et utile dans un résultat Google. */
export const buildServiceMetaDescription = ({
  serviceName,
  categoryName,
  description,
  durationMinutes,
  priceCents,
  priceNote,
}: Readonly<ServiceMetaDescriptionOptions>): string => {
  const label = formatServiceLabel(serviceName, categoryName)
  const price = `${formatPrice(priceCents)}${priceNote === '/ min' ? ' / min' : ''}`
  const details =
    description?.trim() ||
    'Découvrez le soin, ses informations utiles et les modalités de rendez-vous.'

  return truncateMetaDescription(
    `${label} chez ${contact.name} à Bulle : ${durationMinutes} min, ${price}. ${details}`,
  )
}

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
