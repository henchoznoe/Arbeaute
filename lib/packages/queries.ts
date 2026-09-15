import { cacheLife, cacheTag } from 'next/cache'
import prisma from '@/lib/core/prisma'

export const PACKAGES_TAG = 'packages'

const publicPackageSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  priceCents: true,
  sessionCount: true,
  validityMonths: true,
  imageUrl: true,
  services: {
    where: {
      service: {
        isArchived: false,
        isBookable: true,
        isVisible: true,
        category: { isActive: true },
      },
    },
    orderBy: { sortOrder: 'asc' as const },
    select: {
      service: {
        select: {
          id: true,
          slug: true,
          name: true,
          durationMinutes: true,
          priceCents: true,
          category: { select: { name: true } },
        },
      },
    },
  },
} as const

export const getPublicPackages = async () => {
  'use cache'
  cacheLife('max')
  cacheTag(PACKAGES_TAG)

  const packages = await prisma.package.findMany({
    where: {
      isVisible: true,
      isArchived: false,
      services: {
        some: {
          service: {
            isArchived: false,
            isBookable: true,
            isVisible: true,
            category: { isActive: true },
          },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: publicPackageSelect,
  })
  return packages.map(item => ({
    ...item,
    services: item.services.map(entry => ({
      ...entry.service,
      categoryName: entry.service.category?.name ?? '',
    })),
  }))
}

export type PublicPackage = Awaited<
  ReturnType<typeof getPublicPackages>
>[number]
