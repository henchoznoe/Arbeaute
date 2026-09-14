import { describe, expect, it } from 'vitest'
import {
  getAppointmentRevenueCents,
  getPackageCreditSummary,
  getPackageExpiry,
  isInstallmentCount,
} from '@/lib/packages/domain'

describe('forfaits', () => {
  it('compte les séances réservées et celles qui attendent une décision', () => {
    expect(
      getPackageCreditSummary(5, [
        { creditState: 'COUNTED' },
        { creditState: 'DECISION_REQUIRED' },
        { creditState: 'RETURNED' },
      ]),
    ).toEqual({ used: 2, remaining: 3, decisions: 1 })
  })

  it('calcule douze mois après la première séance et respecte la prolongation', () => {
    const start = new Date('2026-09-14T08:00:00Z')
    expect(
      getPackageExpiry({
        validityStartsAt: start,
        validityMonths: 12,
        expiresAtOverride: null,
      })?.toISOString(),
    ).toBe('2027-09-14T08:00:00.000Z')
    const override = new Date('2028-01-01T00:00:00Z')
    expect(
      getPackageExpiry({
        validityStartsAt: start,
        validityMonths: 12,
        expiresAtOverride: override,
      }),
    ).toBe(override)
  })

  it('n’accepte que les trois choix de paiement', () => {
    expect([1, 2, 3].every(isInstallmentCount)).toBe(true)
    expect(isInstallmentCount(4)).toBe(false)
  })

  it('compte le forfait une seule fois sur son rendez-vous de recette', () => {
    expect(
      getAppointmentRevenueCents({
        servicePriceCents: 58_000,
        recognisedPackage: { packagePriceCents: 170_000 },
      }),
    ).toBe(170_000)
    expect(getAppointmentRevenueCents({ servicePriceCents: 58_000 })).toBe(
      58_000,
    )
  })
})
