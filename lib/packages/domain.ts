import { addMonths } from 'date-fns'
import type { PackageSessionCreditState } from '@/prisma/generated/prisma/enums'

const INSTALLMENT_COUNTS = [1, 2, 3] as const
export type InstallmentCount = (typeof INSTALLMENT_COUNTS)[number]

export const isInstallmentCount = (value: number): value is InstallmentCount =>
  INSTALLMENT_COUNTS.includes(value as InstallmentCount)

export const getPackageExpiry = ({
  validityStartsAt,
  validityMonths,
  expiresAtOverride,
}: {
  validityStartsAt: Date | null
  validityMonths: number
  expiresAtOverride: Date | null
}): Date | null =>
  expiresAtOverride ??
  (validityStartsAt ? addMonths(validityStartsAt, validityMonths) : null)

export const getPackageCreditSummary = (
  sessionCount: number,
  sessions: Array<{ creditState: PackageSessionCreditState }>,
) => {
  const used = sessions.filter(
    session => session.creditState !== 'RETURNED',
  ).length
  const decisions = sessions.filter(
    session => session.creditState === 'DECISION_REQUIRED',
  ).length
  return {
    used,
    remaining: Math.max(0, sessionCount - used),
    decisions,
  }
}

export const getAppointmentRevenueCents = ({
  servicePriceCents,
  recognisedPackage,
}: {
  servicePriceCents: number
  recognisedPackage?: { packagePriceCents: number } | null
}): number => recognisedPackage?.packagePriceCents ?? servicePriceCents

export const formatInstallmentChoice = (count: number): string =>
  count === 1 ? 'Paiement en une fois' : `Paiement en ${count} fois`
