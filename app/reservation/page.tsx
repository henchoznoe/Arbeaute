import Link from 'next/link'
import { SiteHeader } from '@/components/layout/site-header'
import { ReservationWizard } from '@/components/reservation/reservation-wizard'
import { getBookableServices } from '@/lib/catalog/queries'
import { createPageMetadata } from '@/lib/config/seo'
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
          <p className="text-sm font-semibold tracking-widest text-rose-500 uppercase">
            Réservation en ligne
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">
            Prendre rendez-vous
          </h1>
          <p className="mt-3 text-muted-foreground">
            Choisissez votre soin et un créneau disponible. La confirmation est
            immédiate.
          </p>
        </div>
        <ReservationWizard
          services={services}
          minDate={window.min}
          maxDate={window.max}
        />
      </main>
    </>
  )
}

export default ReservationPage
