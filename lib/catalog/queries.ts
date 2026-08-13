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
  slug: string
  name: string
  description: string | null
  preparationAdvice: string | null
  contraindications: string | null
  expectedResults: string | null
  aftercareAdvice: string | null
  faqQuestion1: string | null
  faqAnswer1: string | null
  faqQuestion2: string | null
  faqAnswer2: string | null
  faqQuestion3: string | null
  faqAnswer3: string | null
  durationMinutes: number
  priceCents: number
  priceNote: string | null
  imageUrl: string | null
  consentFormUrl: string | null
  isBookable: boolean
}

export interface CatalogCategory {
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
  slug: true,
  name: true,
  description: true,
  preparationAdvice: true,
  contraindications: true,
  expectedResults: true,
  aftercareAdvice: true,
  faqQuestion1: true,
  faqAnswer1: true,
  faqQuestion2: true,
  faqAnswer2: true,
  faqQuestion3: true,
  faqAnswer3: true,
  durationMinutes: true,
  priceCents: true,
  priceNote: true,
  imageUrl: true,
  consentFormUrl: true,
  isBookable: true,
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
