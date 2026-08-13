import { LoaderCircle } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { CustomerAppointmentCard } from '@/components/reservation/customer-appointment-card'
import { CustomerAppointmentHistoryCard } from '@/components/reservation/customer-appointment-history-card'
import { identifyCustomer, logoutCustomer } from '@/lib/actions/reservation'
import { createPageMetadata } from '@/lib/config/seo'
import prisma from '@/lib/core/prisma'
import { getCustomerSession } from '@/lib/core/session-cookies'
import { createAppointmentCalendar } from '@/lib/reservation/calendar'
import {
  CUSTOMER_HISTORY_LIMIT,
  getCustomerAppointmentState,
  getCustomerRebookingPath,
} from '@/lib/reservation/customer-appointments'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import {
  canCustomerChangeAppointment,
  formatAppointmentDate,
  getBookingDateLimits,
  getCustomerChangeDeadline,
} from '@/lib/reservation/time'

export const metadata = createPageMetadata({
  title: 'Mes rendez-vous',
  description:
    'Gérez vos rendez-vous Arbeauté, consultez votre historique et réservez à nouveau.',
  path: '/mes-rendez-vous',
  index: false,
})

interface CustomerAppointmentsPageProps {
  searchParams: Promise<{ error?: string; cancelled?: string }>
}

const fieldClass =
  'h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring'

/**
 * Coquille prérendue : elle part sur le CDN sans invocation, y compris quand
 * un `<Link>` de la page d'accueil précharge la route. Le contenu, qui dépend
 * de la session, est diffusé juste après.
 */
const CustomerAppointmentsSkeleton = () => (
  <>
    <SiteHeader />
    <main className="flex min-h-screen items-center justify-center px-5 pt-16 pb-12">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" />
        <p className="text-sm font-medium">Chargement de vos rendez-vous…</p>
      </div>
    </main>
  </>
)

const CustomerAppointmentsPage = ({
  searchParams,
}: Readonly<CustomerAppointmentsPageProps>) => (
  <Suspense fallback={<CustomerAppointmentsSkeleton />}>
    <CustomerAppointments searchParams={searchParams} />
  </Suspense>
)

const CustomerAppointments = async ({
  searchParams,
}: Readonly<CustomerAppointmentsPageProps>) => {
  const session = await getCustomerSession()
  const { error, cancelled } = await searchParams
  const now = new Date()

  if (!session)
    return (
      <>
        <SiteHeader
          actions={
            <Link
              href="/reservation"
              className="text-sm font-medium whitespace-nowrap underline underline-offset-4"
            >
              Prendre rendez-vous
            </Link>
          }
        />
        <main className="flex min-h-screen items-center justify-center px-5 pt-16 pb-12">
          <section className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-sm sm:p-9">
            {cancelled ? (
              <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                Votre rendez-vous a bien été annulé.
              </p>
            ) : null}
            <h1 className="mt-8 font-heading text-3xl font-bold">
              Mes rendez-vous
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Saisissez exactement l’email et le numéro de téléphone utilisés
              lors de votre réservation.
            </p>
            <form action={identifyCustomer} className="mt-7 space-y-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="votre@email.ch"
                  autoComplete="email"
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Numéro de téléphone complet
                <input
                  name="phone"
                  type="tel"
                  required
                  placeholder="0791234567"
                  autoComplete="tel"
                  className={fieldClass}
                />
              </label>
              <label className="sr-only" aria-hidden="true">
                Site web
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              {error ? (
                <p
                  className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
                  role="alert"
                >
                  Aucun rendez-vous ne correspond à cet email et ce numéro de
                  téléphone. Vérifiez les informations saisies lors de la
                  réservation, ou prenez un nouveau rendez-vous si vous n’en
                  avez pas encore.
                </p>
              ) : null}
              <button
                type="submit"
                className="h-12 w-full rounded-xl bg-primary px-4 font-medium text-primary-foreground"
              >
                Voir mes rendez-vous
              </button>
            </form>
          </section>
        </main>
      </>
    )

  const appointmentInclude = {
    service: {
      select: {
        slug: true,
        isBookable: true,
        isVisible: true,
        isArchived: true,
        category: { select: { name: true } },
      },
    },
  } as const
  const [upcomingAppointments, historyAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        customerIdentityDigest: session.subject,
        status: 'CONFIRMED',
        startsAt: { gt: now },
      },
      orderBy: { startsAt: 'asc' },
      include: appointmentInclude,
    }),
    prisma.appointment.findMany({
      where: {
        customerIdentityDigest: session.subject,
        OR: [{ status: { not: 'CONFIRMED' } }, { startsAt: { lte: now } }],
      },
      orderBy: { startsAt: 'desc' },
      take: CUSTOMER_HISTORY_LIMIT,
      include: appointmentInclude,
    }),
  ])
  const limits = getBookingDateLimits(now)

  return (
    <>
      <SiteHeader
        actions={
          <form action={logoutCustomer}>
            <button
              type="submit"
              className="rounded-full border px-4 py-2 text-sm font-medium"
            >
              Se déconnecter
            </button>
          </form>
        }
      />
      <main className="min-h-screen px-5 pt-24 pb-8 sm:px-8 sm:pt-28 sm:pb-12">
        <section className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold tracking-widest text-rose-500 uppercase">
            Espace personnel
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">
            Mes rendez-vous
          </h1>
          <section className="mt-8" aria-labelledby="upcoming-title">
            <div className="flex items-center gap-3">
              <h2
                id="upcoming-title"
                className="font-heading text-2xl font-bold"
              >
                À venir
              </h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {upcomingAppointments.length}
              </span>
            </div>
            {upcomingAppointments.length > 0 ? (
              <div className="mt-4 space-y-5">
                {upcomingAppointments.map(appointment => (
                  <CustomerAppointmentCard
                    key={appointment.id}
                    id={appointment.id}
                    serviceName={formatServiceLabel(
                      appointment.serviceNameSnapshot,
                      appointment.service.category?.name,
                    )}
                    dateLabel={formatAppointmentDate(appointment.startsAt)}
                    priceLabel={`${(appointment.servicePriceCents / 100).toLocaleString('fr-CH')} CHF`}
                    canChange={canCustomerChangeAppointment(
                      appointment.startsAt,
                      now,
                    )}
                    changeDeadlineLabel={formatAppointmentDate(
                      getCustomerChangeDeadline(appointment.startsAt),
                    )}
                    calendar={createAppointmentCalendar({
                      id: appointment.id,
                      serviceName: appointment.serviceNameSnapshot,
                      startsAt: appointment.startsAt,
                      endsAt: appointment.endsAt,
                    })}
                    bookingPath={getCustomerRebookingPath(appointment.service)}
                    minDate={limits.min}
                    maxDate={limits.max}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border bg-card p-6">
                <p className="text-muted-foreground">
                  Aucun rendez-vous confirmé à venir.
                </p>
                <Link
                  href="/reservation"
                  className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
                >
                  Prendre rendez-vous
                </Link>
              </div>
            )}
          </section>

          <section className="mt-10" aria-labelledby="history-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2
                  id="history-title"
                  className="font-heading text-2xl font-bold"
                >
                  Historique récent
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Jusqu’à {CUSTOMER_HISTORY_LIMIT} rendez-vous récents sont
                  affichés.
                </p>
              </div>
            </div>
            {historyAppointments.length > 0 ? (
              <div className="mt-4 space-y-3">
                {historyAppointments.map(appointment => {
                  const state = getCustomerAppointmentState(appointment, now)
                  if (state === 'UPCOMING') return null
                  return (
                    <CustomerAppointmentHistoryCard
                      key={appointment.id}
                      serviceName={formatServiceLabel(
                        appointment.serviceNameSnapshot,
                        appointment.service.category?.name,
                      )}
                      dateLabel={formatAppointmentDate(appointment.startsAt)}
                      priceLabel={`${(appointment.servicePriceCents / 100).toLocaleString('fr-CH')} CHF`}
                      state={state}
                      bookingPath={getCustomerRebookingPath(
                        appointment.service,
                      )}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Aucun rendez-vous passé à afficher pour le moment.
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  )
}

export default CustomerAppointmentsPage
