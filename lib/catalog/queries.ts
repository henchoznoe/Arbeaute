import { cacheLife, cacheTag } from 'next/cache'
import prisma from '@/lib/core/prisma'

/**
 * Lectures publiques du catalogue, mises en cache sous un tag commun.
 *
 * Le catalogue ne bouge que lorsque Arzu l'édite : le mettre en cache le fait
 * entrer dans le shell prérendu des pages publiques, qui sont alors servies
 * depuis le CDN sans invocation de fonction. Les actions d'administration
 * appellent `updateTag(CATALOG_TAG)` pour que la modification soit visible
 * immédiatement.
 */
export const CATALOG_TAG = 'catalog'

interface CatalogService {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  priceCents: number
  priceNote: string | null
  imageUrl: string | null
  consentFormUrl: string | null
}

interface CatalogCategory {
  id: string
  name: string
  description: string | null
  color: string
  services: CatalogService[]
}

interface BookableService extends CatalogService {
  categoryName: string
}

const serviceFields = {
  id: true,
  name: true,
  description: true,
  durationMinutes: true,
  priceCents: true,
  priceNote: true,
  imageUrl: true,
  consentFormUrl: true,
} as const

const serviceOrder = [{ sortOrder: 'asc' }, { name: 'asc' }] as const

const categoryOrder = [{ sortOrder: 'asc' }, { name: 'asc' }] as const

/** Prestations visibles, groupées par catégorie — page d'accueil. */
export const getPublicCatalog = async (): Promise<CatalogCategory[]> => {
  'use cache'
  cacheLife('max')
  cacheTag(CATALOG_TAG)

  return prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: [...categoryOrder],
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      services: {
        where: { isVisible: true, isArchived: false },
        orderBy: [...serviceOrder],
        select: serviceFields,
      },
    },
  })
}

/** Prestations réservables en ligne, à plat — tunnel de réservation. */
export const getBookableServices = async (): Promise<BookableService[]> => {
  'use cache'
  cacheLife('max')
  cacheTag(CATALOG_TAG)

  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: [...categoryOrder],
    select: {
      name: true,
      services: {
        where: { isBookable: true, isVisible: true, isArchived: false },
        orderBy: [...serviceOrder],
        select: serviceFields,
      },
    },
  })

  return categories.flatMap(category =>
    category.services.map(service => ({
      ...service,
      categoryName: category.name,
    })),
  )
}
