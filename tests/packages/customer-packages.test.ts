import { describe, expect, it, vi } from 'vitest'
import { getBookableCustomerPackages } from '@/lib/packages/customer-packages'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

const now = new Date('2026-09-15T10:00:00.000Z')
const service = {
  id: 'service-1',
  name: 'Visage',
  durationMinutes: 60,
  category: { name: 'Laser' },
}

const makePackage = (overrides: Record<string, unknown> = {}) => ({
  id: 'customer-package-1',
  packageNameSnapshot: 'Forfait laser',
  packagePriceCents: 100000,
  sessionCountSnapshot: 4,
  validityMonthsSnapshot: 12,
  installmentCount: 2,
  validityStartsAt: new Date('2026-09-01T10:00:00.000Z'),
  expiresAtOverride: null,
  sessions: [{ creditState: 'COUNTED' }],
  allowedServices: [{ service }],
  ...overrides,
})

const makeDatabase = (items: ReturnType<typeof makePackage>[]) =>
  ({
    customerPackage: {
      findMany: vi.fn().mockResolvedValue(items),
    },
  }) as unknown as PrismaClient

describe('forfaits utilisables en ligne', () => {
  it('retourne le solde, les soins et la modalité globale de paiement', async () => {
    const result = await getBookableCustomerPackages(
      makeDatabase([makePackage()]),
      'customer-1',
      now,
    )

    expect(result).toEqual([
      expect.objectContaining({
        id: 'customer-package-1',
        remainingCredits: 3,
        installmentCount: 2,
        pendingDecisions: 0,
        services: [
          expect.objectContaining({ id: 'service-1', categoryName: 'Laser' }),
        ],
      }),
    ])
  })

  it('écarte les forfaits expirés, terminés ou sans soin réservable', async () => {
    const result = await getBookableCustomerPackages(
      makeDatabase([
        makePackage({
          id: 'expired',
          expiresAtOverride: new Date('2026-09-14T22:00:00.000Z'),
        }),
        makePackage({
          id: 'finished',
          sessions: Array.from({ length: 4 }, () => ({
            creditState: 'COUNTED',
          })),
        }),
        makePackage({ id: 'hidden-service', allowedServices: [] }),
      ]),
      'customer-1',
      now,
    )

    expect(result).toEqual([])
  })

  it('réserve provisoirement le crédit d’une séance à traiter', async () => {
    const result = await getBookableCustomerPackages(
      makeDatabase([
        makePackage({
          sessions: [
            { creditState: 'COUNTED' },
            { creditState: 'DECISION_REQUIRED' },
          ],
        }),
      ]),
      'customer-1',
      now,
    )

    expect(result[0]).toMatchObject({
      remainingCredits: 2,
      pendingDecisions: 1,
    })
  })
})
