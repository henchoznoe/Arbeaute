import Link from 'next/link'
import { Suspense } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { ReservationWizard } from '@/components/reservation/reservation-wizard'
import { getBookableServices } from '@/lib/catalog/queries'
import { createPageMetadata } from '@/lib/config/seo'
import { isEmailConfigured } from '@/lib/core/env'
import { getPublicBookingWindow } from '@/lib/reservation/booking-window'

export const metadata = createPageMetadata({
  title: 'Prendre rendez-vous en ligne',
  description:
    'Réservez votre soin esthétique à Bulle en quelques clics : choisissez votre prestation, un créneau disponible et confirmez immédiatement.',
  path: '/reservation',
})

const ReservationPage = async () => {
  const [services, window] = await Promise.all([
    getBookableServices(),
    getPublicBookingWindow(),
  ])

  return (
    <>
      <SiteHeader
        actions={
          <Link
            href="/mes-rendez-vous"
            className="text-sm font-medium whitespace-nowrap underline underline-offset-4"
          >
            Mes rendez-vous
          </Link>
        }
      />
      <main className="min-h-screen px-5 pt-24 pb-8 sm:px-8 sm:pt-28 sm:pb-12">
        <div className="mx-auto mb-9 max-w-3xl">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Réservation en ligne
          </p>
          <h1 className="mt-2 font-heading text-title font-bold">
            Prendre rendez-vous
          </h1>
          <p className="mt-3 text-muted-foreground">
            Choisissez votre soin et un créneau disponible. La réservation est
            confirmée immédiatement à l’écran
            {isEmailConfigured ? ', puis par e-mail' : null}.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="mx-auto h-72 max-w-3xl animate-pulse rounded-3xl border bg-muted/50" />
          }
        >
          <ReservationWizard
            services={services}
            minDate={window.min}
            maxDate={window.max}
            customerChangeCutoffLabel={window.customerChangeCutoffLabel}
          />
        </Suspense>
      </main>
    </>
  )
}

export default ReservationPage
