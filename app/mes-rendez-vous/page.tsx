import Link from 'next/link'
import { Suspense } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { CustomerAppointmentCard } from '@/components/reservation/customer-appointment-card'
import { CustomerAppointmentHistoryCard } from '@/components/reservation/customer-appointment-history-card'
import { PendingRequestCard } from '@/components/reservation/pending-request-card'
import { Button } from '@/components/ui/button'
import { FormField, formControlClass } from '@/components/ui/form-field'
import { Skeleton } from '@/components/ui/skeleton'
import { MAIN_CONTENT_ID } from '@/components/ui/skip-link'
import { identifyCustomer, logoutCustomer } from '@/lib/actions/reservation'
import { createPageMetadata } from '@/lib/config/seo'
import prisma from '@/lib/core/prisma'
import { getCustomerSession } from '@/lib/core/session-cookies'
import {
  formatCustomerChangeCutoff,
  getBookingSettings,
} from '@/lib/reservation/booking-settings'
import { createAppointmentCalendar } from '@/lib/reservation/calendar'
import {
  CUSTOMER_HISTORY_LIMIT,
  getCustomerAppointmentState,
  getCustomerRebookingPath,
} from '@/lib/reservation/customer-appointments'
import { findCustomerForSession } from '@/lib/reservation/customers'
import { getPendingLateRequestsForCustomer } from '@/lib/reservation/late-requests'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import {
  canCustomerChangeAppointment,
  formatAppointmentDate,
  getBookingDateLimits,
  getCustomerChangeDeadline,
  getLocalDateKey,
} from '@/lib/reservation/time'
import { cn } from '@/lib/utils/cn'
import { formatPrice } from '@/lib/utils/format'

export const metadata = createPageMetadata({
  title: 'Mes rendez-vous',
  description:
    'Gérez vos rendez-vous Arbeauté, consultez votre historique et réservez à nouveau.',
  path: '/mes-rendez-vous',
  index: false,
})

interface CustomerAppointmentsPageProps {
  searchParams: Promise<{ error?: string }>
}

const fieldClass = cn(formControlClass, 'min-h-12 px-4')

/**
 * Coquille prérendue : elle part sur le CDN sans invocation, y compris quand
 * un `<Link>` de la page d'accueil précharge la route. Le contenu, qui dépend
 * de la session, est diffusé juste après.
 *
 * Elle reprend la forme de la page connectée — titre, compteur, deux cartes de
 * rendez-vous — parce que c'est le cas le plus fréquent et que la coquille ne
 * doit pas déplacer la mise en page à l'arrivée du contenu.
 */
const CustomerAppointmentsSkeleton = () => (
  <>
    <SiteHeader />
    <main
      id={MAIN_CONTENT_ID}
      className="min-h-screen px-5 pt-24 pb-8 sm:px-8 sm:pt-28 sm:pb-12"
    >
      <p role="status" className="sr-only">
        Chargement de vos rendez-vous…
      </p>
      <section className="mx-auto max-w-3xl">
        <Skeleton className="h-4 w-36 rounded-full" />
        <Skeleton className="mt-3 h-9 w-64" />
        <div className="mt-8 flex items-center gap-3">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="size-7 rounded-full" />
        </div>
        <div className="mt-4 space-y-5">
          <Skeleton className="h-52 rounded-3xl" />
          <Skeleton className="h-52 rounded-3xl" />
        </div>
        <Skeleton className="mt-10 h-8 w-52" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </section>
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
  const customer = session
    ? await findCustomerForSession(prisma, session)
    : null
  const { error } = await searchParams
  const now = new Date()

  if (!customer)
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
        <main
          id={MAIN_CONTENT_ID}
          className="flex min-h-screen items-center justify-center px-5 pt-16 pb-12"
        >
          <section className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-sm sm:p-9">
            <h1 className="font-heading text-title font-bold">
              Mes rendez-vous
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Saisissez l’adresse e-mail utilisée lors de votre réservation.
            </p>
            <form action={identifyCustomer} className="mt-7 space-y-4">
              <FormField controlId="customer-email" label="Adresse e-mail">
                <input
                  id="customer-email"
                  name="email"
                  type="email"
                  required
                  placeholder="votre@email.ch"
                  autoComplete="email"
                  className={fieldClass}
                />
              </FormField>
              <label className="sr-only" aria-hidden="true">
                Site web
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              {error ? (
                <p
                  className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
                  role="alert"
                >
                  Aucun rendez-vous ne correspond à cette adresse. Elle est
                  écrite dans l’e-mail de confirmation que vous avez reçu :
                  recopiez-la telle quelle. Si vous n’avez pas encore de
                  rendez-vous, prenez-en un.
                </p>
              ) : null}
              <Button type="submit" size="lg" className="w-full">
                Voir mes rendez-vous
              </Button>
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
  const [upcomingAppointments, historyAppointments, settings, pendingRequests] =
    await Promise.all([
      prisma.appointment.findMany({
        where: {
          customerId: customer.id,
          status: 'CONFIRMED',
          startsAt: { gt: now },
        },
        orderBy: { startsAt: 'asc' },
        include: appointmentInclude,
      }),
      prisma.appointment.findMany({
        where: {
          customerId: customer.id,
          OR: [{ status: { not: 'CONFIRMED' } }, { startsAt: { lte: now } }],
        },
        orderBy: { startsAt: 'desc' },
        take: CUSTOMER_HISTORY_LIMIT,
        include: appointmentInclude,
      }),
      getBookingSettings(),
      getPendingLateRequestsForCustomer(customer.id),
    ])
  const limits = getBookingDateLimits(now, settings.bookingHorizonMonths)
  const customerChangeCutoffLabel = formatCustomerChangeCutoff(
    settings.customerChangeCutoffHours,
  )

  return (
    <>
      <SiteHeader
        actions={
          <form action={logoutCustomer}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              Se déconnecter
            </Button>
          </form>
        }
      />
      <main
        id={MAIN_CONTENT_ID}
        className="min-h-screen px-5 pt-24 pb-8 sm:px-8 sm:pt-28 sm:pb-12"
      >
        <section className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Espace personnel
          </p>
          <h1 className="mt-2 font-heading text-title font-bold">
            Mes rendez-vous
          </h1>
          {/* Avant « À venir » : une demande sans réponse est la question la
              plus pressante que la personne se pose en ouvrant cette page. */}
          {pendingRequests.length > 0 ? (
            <section className="mt-8" aria-labelledby="pending-requests-title">
              <h2
                id="pending-requests-title"
                className="font-heading text-2xl font-bold"
              >
                En attente de réponse
              </h2>
              <div className="mt-4 space-y-5">
                {pendingRequests.map(request => (
                  <PendingRequestCard
                    key={request.id}
                    requestId={request.id}
                    serviceLabel={formatServiceLabel(
                      request.serviceNameSnapshot,
                      request.service.category?.name,
                    )}
                    dateLabel={formatAppointmentDate(request.requestedStartsAt)}
                    priceLabel={formatPrice(request.servicePriceCents)}
                  />
                ))}
              </div>
            </section>
          ) : null}

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
                    serviceLabel={formatServiceLabel(
                      appointment.serviceNameSnapshot,
                      appointment.service.category?.name,
                    )}
                    dateLabel={formatAppointmentDate(appointment.startsAt)}
                    priceLabel={formatPrice(appointment.servicePriceCents)}
                    canChange={canCustomerChangeAppointment(
                      appointment.startsAt,
                      now,
                      settings.customerChangeCutoffHours,
                    )}
                    changeDeadlineLabel={formatAppointmentDate(
                      getCustomerChangeDeadline(
                        appointment.startsAt,
                        settings.customerChangeCutoffHours,
                      ),
                    )}
                    customerChangeCutoffLabel={customerChangeCutoffLabel}
                    calendar={createAppointmentCalendar({
                      id: appointment.id,
                      serviceLabel: formatServiceLabel(
                        appointment.serviceNameSnapshot,
                        appointment.service.category?.name,
                      ),
                      startsAt: appointment.startsAt,
                      endsAt: appointment.endsAt,
                    })}
                    bookingPath={getCustomerRebookingPath(appointment.service)}
                    dateKey={getLocalDateKey(appointment.startsAt)}
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
                <Button asChild className="mt-4">
                  <Link href="/reservation">Prendre rendez-vous</Link>
                </Button>
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
                      serviceLabel={formatServiceLabel(
                        appointment.serviceNameSnapshot,
                        appointment.service.category?.name,
                      )}
                      dateLabel={formatAppointmentDate(appointment.startsAt)}
                      priceLabel={formatPrice(appointment.servicePriceCents)}
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
