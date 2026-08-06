import Link from 'next/link'
import { SiteHeader } from '@/components/layout/site-header'
import { CustomerAppointmentCard } from '@/components/reservation/customer-appointment-card'
import { identifyCustomer, logoutCustomer } from '@/lib/actions/reservation'
import prisma from '@/lib/core/prisma'
import { getCustomerSession } from '@/lib/core/session-cookies'
import { createAppointmentCalendar } from '@/lib/reservation/calendar'
import {
  canCustomerChangeAppointment,
  formatAppointmentDate,
  getBookingDateLimits,
  getLocalDateKey,
} from '@/lib/reservation/time'

export const dynamic = 'force-dynamic'

interface CustomerAppointmentsPageProps {
  searchParams: Promise<{ error?: string; cancelled?: string }>
}

const fieldClass =
  'h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring'

const CustomerAppointmentsPage = async ({
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
              <label className="block space-y-2 text-sm font-medium">
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
              <label className="block space-y-2 text-sm font-medium">
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
                  Identification impossible. Vérifiez les informations ou
                  réessayez plus tard.
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

  const appointments = await prisma.appointment.findMany({
    where: {
      customerIdentityDigest: session.subject,
      status: 'CONFIRMED',
      startsAt: { gt: now },
    },
    orderBy: { startsAt: 'asc' },
    include: {
      service: { select: { category: { select: { name: true } } } },
    },
  })
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
          {appointments.length > 0 ? (
            <div className="mt-8 space-y-5">
              {appointments.map(appointment => (
                <CustomerAppointmentCard
                  key={appointment.id}
                  id={appointment.id}
                  serviceName={
                    appointment.service.category
                      ? `${appointment.service.category.name} — ${appointment.serviceNameSnapshot}`
                      : appointment.serviceNameSnapshot
                  }
                  dateLabel={formatAppointmentDate(appointment.startsAt)}
                  dateKey={getLocalDateKey(appointment.startsAt)}
                  priceLabel={`${(appointment.servicePriceCents / 100).toLocaleString('fr-CH')} CHF`}
                  canChange={canCustomerChangeAppointment(
                    appointment.startsAt,
                    now,
                  )}
                  calendar={createAppointmentCalendar({
                    id: appointment.id,
                    serviceName: appointment.serviceNameSnapshot,
                    startsAt: appointment.startsAt,
                    endsAt: appointment.endsAt,
                  })}
                  minDate={limits.min}
                  maxDate={limits.max}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border bg-card p-8 text-center">
              <p className="text-muted-foreground">
                Aucun rendez-vous futur à afficher.
              </p>
              <Link
                href="/reservation"
                className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                Prendre rendez-vous
              </Link>
            </div>
          )}
        </section>
      </main>
    </>
  )
}

export default CustomerAppointmentsPage
