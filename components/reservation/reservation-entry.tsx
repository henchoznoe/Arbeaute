'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { BookableCustomerPackage } from '@/lib/packages/customer-packages'
import type { PublicPackage } from '@/lib/packages/queries'
import { cn } from '@/lib/utils/cn'
import { CustomerPackageReservationWizard } from './customer-package-reservation-wizard'
import { PackageReservationWizard } from './package-reservation-wizard'
import { ReservationWizard } from './reservation-wizard'

export const ReservationEntry = ({
  services,
  packages,
  customerPackages,
  customerAuthenticated,
  minDate,
  maxDate,
  customerChangeCutoffLabel,
}: Readonly<{
  services: Parameters<typeof ReservationWizard>[0]['services']
  packages: PublicPackage[]
  customerPackages: BookableCustomerPackage[]
  customerAuthenticated: boolean
  minDate: string
  maxDate: string
  customerChangeCutoffLabel: string
}>) => {
  const params = useSearchParams()
  const requestedPackage = params.get('forfait')
  const purchaseMode =
    requestedPackage !== null || params.get('type') === 'forfait'
  const requestedCustomerPackage = params.get('utiliserForfait')
  const customerPackageMode =
    requestedCustomerPackage !== null || params.get('type') === 'mon-forfait'
  return (
    <>
      <nav
        className="mx-auto mb-6 grid max-w-2xl grid-cols-1 gap-1 rounded-2xl bg-muted p-1 sm:grid-cols-3 sm:rounded-full"
        aria-label="Type de réservation"
      >
        <Link
          href="/reservation"
          className={cn(
            'rounded-full px-4 py-2 text-center text-sm font-medium',
            !purchaseMode && !customerPackageMode && 'bg-background shadow-sm',
          )}
        >
          Réserver un soin
        </Link>
        <Link
          href="/reservation?type=forfait"
          className={cn(
            'rounded-full px-4 py-2 text-center text-sm font-medium',
            purchaseMode && 'bg-background shadow-sm',
          )}
        >
          Acheter un forfait
        </Link>
        <Link
          href="/reservation?type=mon-forfait"
          className={cn(
            'rounded-full px-4 py-2 text-center text-sm font-medium',
            customerPackageMode && 'bg-background shadow-sm',
          )}
        >
          Utiliser mon forfait
        </Link>
      </nav>
      {!purchaseMode && !customerPackageMode ? (
        <aside className="mx-auto mb-6 max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <p className="font-medium">Vous avez déjà un forfait actif ?</p>
          <p className="mt-1 text-muted-foreground">
            Réservez depuis « Utiliser mon forfait » pour déduire une séance au
            lieu d’afficher le prix normal du soin.
          </p>
          <Link
            href="/reservation?type=mon-forfait"
            className="mt-2 inline-block font-semibold text-primary underline underline-offset-4"
          >
            Utiliser mon forfait
          </Link>
        </aside>
      ) : null}
      {customerPackageMode ? (
        <CustomerPackageReservationWizard
          key={`${requestedCustomerPackage ?? ''}:${params.get('serviceId') ?? ''}:${params.get('startsAt') ?? ''}`}
          packages={customerPackages}
          requestedId={requestedCustomerPackage}
          requestedServiceId={params.get('serviceId')}
          requestedStartsAt={params.get('startsAt')}
          authenticated={customerAuthenticated}
          identificationError={params.get('error') === 'identification'}
          minDate={minDate}
          maxDate={maxDate}
        />
      ) : purchaseMode ? (
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
