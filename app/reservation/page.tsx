import Link from 'next/link'
import { Suspense } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { ReservationWizard } from '@/components/reservation/reservation-wizard'
import { Skeleton, skeletonKeys } from '@/components/ui/skeleton'
import { MAIN_CONTENT_ID } from '@/components/ui/skip-link'
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

/** Barre d'étapes puis cartes de prestation : la première vue du tunnel. */
const WizardSkeleton = () => (
  <section className="mx-auto max-w-3xl">
    <p role="status" className="sr-only">
      Chargement des prestations…
    </p>
    <div className="mb-5 grid grid-cols-4 gap-1 sm:mb-8 sm:gap-2">
      {skeletonKeys(4).map(key => (
        <Skeleton key={key} className="h-14" />
      ))}
    </div>
    {skeletonKeys(2).map(key => (
      <div key={key} className="mt-8 first:mt-0">
        <Skeleton className="h-7 w-40" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {skeletonKeys(4).map(cardKey => (
            <Skeleton key={cardKey} className="h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    ))}
  </section>
)

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
      <main
        id={MAIN_CONTENT_ID}
        className="min-h-screen px-5 pt-24 pb-8 sm:px-8 sm:pt-28 sm:pb-12"
      >
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
        <Suspense fallback={<WizardSkeleton />}>
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
