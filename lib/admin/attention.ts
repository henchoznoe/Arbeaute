import { cache } from 'react'
import { getUpcomingConflicts } from '@/lib/admin/conflict-queries'
import { getPendingLateRequestCount } from '@/lib/reservation/late-requests'

export const countAdminAttentionItems = ({
  pendingRequestCount,
  conflictGroupCount,
}: {
  pendingRequestCount: number
  conflictGroupCount: number
}): number => pendingRequestCount + conflictGroupCount

/**
 * Une seule lecture partagée par la coquille, l'agenda et la page « À traiter ».
 * Sans `cache`, chacune recalculerait séparément les mêmes demandes et les mêmes
 * superpositions pendant un rendu.
 */
export const getAdminAttentionSummary = cache(async () => {
  const now = new Date()
  const [pendingRequestCount, conflicts] = await Promise.all([
    getPendingLateRequestCount(now),
    getUpcomingConflicts(now),
  ])
  const conflictGroupCount = conflicts.groups.length

  return {
    pendingRequestCount,
    conflicts,
    conflictGroupCount,
    totalCount: countAdminAttentionItems({
      pendingRequestCount,
      conflictGroupCount,
    }),
  }
})
