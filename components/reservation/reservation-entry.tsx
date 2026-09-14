'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { PublicPackage } from '@/lib/packages/queries'
import { cn } from '@/lib/utils/cn'
import { PackageReservationWizard } from './package-reservation-wizard'
import { ReservationWizard } from './reservation-wizard'

export const ReservationEntry = ({
  services,
  packages,
  minDate,
  maxDate,
  customerChangeCutoffLabel,
}: Readonly<{
  services: Parameters<typeof ReservationWizard>[0]['services']
  packages: PublicPackage[]
  minDate: string
  maxDate: string
  customerChangeCutoffLabel: string
}>) => {
  const params = useSearchParams()
  const requestedPackage = params.get('forfait')
  const packageMode =
    requestedPackage !== null || params.get('type') === 'forfait'
  return (
    <>
      <nav
        className="mx-auto mb-6 grid max-w-md grid-cols-2 rounded-full bg-muted p-1"
        aria-label="Type de réservation"
      >
        <Link
          href="/reservation"
          className={cn(
            'rounded-full px-4 py-2 text-center text-sm font-medium',
            !packageMode && 'bg-background shadow-sm',
          )}
        >
          Une prestation
        </Link>
        <Link
          href="/reservation?type=forfait"
          className={cn(
            'rounded-full px-4 py-2 text-center text-sm font-medium',
            packageMode && 'bg-background shadow-sm',
          )}
        >
          Un forfait
        </Link>
      </nav>
      {packageMode ? (
        <PackageReservationWizard
          packages={packages}
          requestedSlug={requestedPackage}
          minDate={minDate}
          maxDate={maxDate}
        />
      ) : (
        <ReservationWizard
          services={services}
          minDate={minDate}
          maxDate={maxDate}
          customerChangeCutoffLabel={customerChangeCutoffLabel}
        />
      )}
    </>
  )
}
