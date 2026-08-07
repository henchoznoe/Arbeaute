import Link from 'next/link'
import { SiteHeader } from '@/components/layout/site-header'
import { ReservationWizard } from '@/components/reservation/reservation-wizard'
import prisma from '@/lib/core/prisma'
import { getBookingDateLimits } from '@/lib/reservation/time'

export const dynamic = 'force-dynamic'

const ReservationPage = async () => {
  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      services: {
        where: { isBookable: true, isVisible: true, isArchived: false },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      },
    },
  })
  const services = categories.flatMap(category =>
    category.services.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      priceNote: service.priceNote,
      consentFormUrl: service.consentFormUrl,
      categoryName: category.name,
    })),
  )
  const limits = getBookingDateLimits()

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
          minDate={limits.min}
          maxDate={limits.max}
        />
      </main>
    </>
  )
}

export default ReservationPage
