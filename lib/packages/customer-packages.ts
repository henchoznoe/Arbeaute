import type { PrismaClient } from '@/prisma/generated/prisma/client'
import { getPackageCreditSummary, getPackageExpiry } from './domain'

/** Forfaits que la personne connectée peut encore utiliser en ligne. */
export const getBookableCustomerPackages = async (
  database: PrismaClient,
  customerId: string,
  now: Date,
) => {
  const items = await database.customerPackage.findMany({
    where: { customerId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: {
      sessions: { select: { creditState: true } },
      allowedServices: {
        orderBy: { service: { name: 'asc' } },
        where: {
          service: {
            isArchived: false,
            isBookable: true,
            isVisible: true,
            category: { isActive: true },
          },
        },
        select: {
          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  return items.flatMap(item => {
    const credits = getPackageCreditSummary(
      item.sessionCountSnapshot,
      item.sessions,
    )
    const expiry = getPackageExpiry({
      validityStartsAt: item.validityStartsAt,
      validityMonths: item.validityMonthsSnapshot,
      expiresAtOverride: item.expiresAtOverride,
    })
    if (
      credits.remaining < 1 ||
      (expiry !== null && expiry < now) ||
      item.allowedServices.length === 0
    )
      return []

    return [
      {
        id: item.id,
        name: item.packageNameSnapshot,
        priceCents: item.packagePriceCents,
        sessionCount: item.sessionCountSnapshot,
        installmentCount: item.installmentCount,
        remainingCredits: credits.remaining,
        pendingDecisions: credits.decisions,
        expiresAt: expiry?.toISOString() ?? null,
        services: item.allowedServices.map(entry => ({
          id: entry.service.id,
          name: entry.service.name,
          durationMinutes: entry.service.durationMinutes,
          categoryName: entry.service.category?.name ?? '',
        })),
      },
    ]
  })
}

export type BookableCustomerPackage = Awaited<
  ReturnType<typeof getBookableCustomerPackages>
>[number]
