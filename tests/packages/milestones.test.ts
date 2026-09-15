import { describe, expect, it, vi } from 'vitest'
import { syncCustomerPackageMilestones } from '@/lib/packages/milestones'

const makeTransaction = ({
  sessions,
  validityMonths = 12,
  expiresAtOverride = null,
}: {
  sessions: Array<{
    appointmentId: string
    startsAt: string
    creditState?: 'COUNTED' | 'DECISION_REQUIRED'
  }>
  validityMonths?: number
  expiresAtOverride?: Date | null
}) => ({
  customerPackage: {
    findUniqueOrThrow: vi.fn().mockResolvedValue({
      validityMonthsSnapshot: validityMonths,
      expiresAtOverride,
    }),
    update: vi.fn().mockResolvedValue({}),
  },
  packageSession: {
    findMany: vi.fn().mockResolvedValue(
      sessions.map(session => ({
        appointmentId: session.appointmentId,
        creditState: session.creditState ?? 'COUNTED',
        appointment: { startsAt: new Date(session.startsAt) },
      })),
    ),
  },
})

describe('jalons d’un forfait vendu', () => {
  it('place la validité et le montant sur la première séance comptée', async () => {
    const transaction = makeTransaction({
      sessions: [
        { appointmentId: 'first', startsAt: '2026-09-20T08:00:00.000Z' },
        { appointmentId: 'second', startsAt: '2027-03-20T08:00:00.000Z' },
      ],
    })

    await syncCustomerPackageMilestones(transaction as never, 'package-1')

    expect(transaction.packageSession.findMany).toHaveBeenCalledWith({
      where: {
        customerPackageId: 'package-1',
        creditState: { not: 'RETURNED' },
      },
      orderBy: { appointment: { startsAt: 'asc' } },
      select: {
        appointmentId: true,
        creditState: true,
        appointment: { select: { startsAt: true } },
      },
    })
    expect(transaction.customerPackage.update).toHaveBeenCalledWith({
      where: { id: 'package-1' },
      data: {
        revenueAppointmentId: 'first',
        validityStartsAt: new Date('2026-09-20T08:00:00.000Z'),
      },
    })
  })

  it('refuse une séance au-delà de la validité calculée', async () => {
    const transaction = makeTransaction({
      validityMonths: 3,
      sessions: [
        { appointmentId: 'first', startsAt: '2026-09-20T08:00:00.000Z' },
        { appointmentId: 'late', startsAt: '2026-12-21T08:00:00.000Z' },
      ],
    })

    await expect(
      syncCustomerPackageMilestones(transaction as never, 'package-1'),
    ).rejects.toThrow('PACKAGE_SESSION_OUTSIDE_VALIDITY')
    expect(transaction.customerPackage.update).not.toHaveBeenCalled()
  })

  it('garde le début en attente mais porte le montant sur la première séance comptée', async () => {
    const transaction = makeTransaction({
      sessions: [
        {
          appointmentId: 'pending',
          startsAt: '2026-09-20T08:00:00.000Z',
          creditState: 'DECISION_REQUIRED',
        },
        { appointmentId: 'counted', startsAt: '2026-10-20T08:00:00.000Z' },
      ],
    })

    await syncCustomerPackageMilestones(transaction as never, 'package-1')

    expect(transaction.customerPackage.update).toHaveBeenCalledWith({
      where: { id: 'package-1' },
      data: {
        revenueAppointmentId: 'counted',
        validityStartsAt: new Date('2026-09-20T08:00:00.000Z'),
      },
    })
  })

  it('respecte une prolongation et remet les jalons à vide sans séance comptée', async () => {
    const transaction = makeTransaction({
      expiresAtOverride: new Date('2027-01-31T22:59:59.999Z'),
      sessions: [
        { appointmentId: 'first', startsAt: '2026-09-20T08:00:00.000Z' },
        { appointmentId: 'late', startsAt: '2027-01-20T08:00:00.000Z' },
      ],
    })
    await syncCustomerPackageMilestones(transaction as never, 'package-1')
    transaction.packageSession.findMany.mockResolvedValue([])

    await syncCustomerPackageMilestones(transaction as never, 'package-1')

    expect(transaction.customerPackage.update).toHaveBeenLastCalledWith({
      where: { id: 'package-1' },
      data: { revenueAppointmentId: null, validityStartsAt: null },
    })
  })
})
