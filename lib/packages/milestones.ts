import { addMonths } from 'date-fns'
import type { Prisma } from '@/prisma/generated/prisma/client'

/**
 * Le premier crédit réservé lance la validité ; le premier crédit définitivement
 * compté porte le prix. Une séance « à traiter » continue donc de borner le
 * contrat, sans reconnaître le montant tant qu'Arzu n'a pas tranché.
 */
export const syncCustomerPackageMilestones = async (
  transaction: Prisma.TransactionClient,
  customerPackageId: string,
) => {
  const [soldPackage, sessions] = await Promise.all([
    transaction.customerPackage.findUniqueOrThrow({
      where: { id: customerPackageId },
      select: {
        validityMonthsSnapshot: true,
        expiresAtOverride: true,
      },
    }),
    transaction.packageSession.findMany({
      where: { customerPackageId, creditState: { not: 'RETURNED' } },
      orderBy: { appointment: { startsAt: 'asc' } },
      select: {
        appointmentId: true,
        creditState: true,
        appointment: { select: { startsAt: true } },
      },
    }),
  ])
  const first = sessions[0]
  const last = sessions.at(-1)
  const firstCounted = sessions.find(
    session => session.creditState === 'COUNTED',
  )
  const expiry =
    soldPackage.expiresAtOverride ??
    (first
      ? addMonths(
          first.appointment.startsAt,
          soldPackage.validityMonthsSnapshot,
        )
      : null)
  if (expiry && last && last.appointment.startsAt > expiry)
    throw new Error('PACKAGE_SESSION_OUTSIDE_VALIDITY')
  await transaction.customerPackage.update({
    where: { id: customerPackageId },
    data: {
      revenueAppointmentId: firstCounted?.appointmentId ?? null,
      validityStartsAt: first?.appointment.startsAt ?? null,
    },
  })
  return { first, firstCounted }
}
