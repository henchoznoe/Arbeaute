import { cache } from 'react'
import { getUpcomingConflicts } from '@/lib/admin/conflict-queries'
import prisma from '@/lib/core/prisma'
import { getPendingLateRequestCount } from '@/lib/reservation/late-requests'

export const countAdminAttentionItems = ({
  pendingRequestCount,
  conflictGroupCount,
  packageCreditCount = 0,
}: {
  pendingRequestCount: number
  conflictGroupCount: number
  packageCreditCount?: number
}): number => pendingRequestCount + conflictGroupCount + packageCreditCount

/**
 * Une seule lecture partagée par la coquille, l'agenda et la page « À traiter ».
 * Sans `cache`, chacune recalculerait séparément les mêmes demandes et les mêmes
 * superpositions pendant un rendu.
 */
export const getAdminAttentionSummary = cache(async () => {
  const now = new Date()
  const [pendingRequestCount, conflicts, packageCreditCount] =
    await Promise.all([
      getPendingLateRequestCount(now),
      getUpcomingConflicts(now),
      prisma.packageSession.count({
        where: { creditState: 'DECISION_REQUIRED' },
      }),
    ])
  const conflictGroupCount = conflicts.groups.length

  return {
    pendingRequestCount,
    conflicts,
    conflictGroupCount,
    packageCreditCount,
    totalCount: countAdminAttentionItems({
      pendingRequestCount,
      conflictGroupCount,
      packageCreditCount,
    }),
  }
})
