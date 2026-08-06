import Link from 'next/link'
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
  searchParams: Promise<{ error?: string }>
}

const fieldClass =
  'h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring'

const CustomerAppointmentsPage = async ({
  searchParams,
}: Readonly<CustomerAppointmentsPageProps>) => {
  const session = await getCustomerSession()
  const { error } = await searchParams
  const now = new Date()

  if (!session)
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-12">
        <section className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-sm sm:p-9">
          <Link href="/" className="font-heading text-xl font-bold">
            Arbeauté
          </Link>
          <h1 className="mt-8 font-heading text-3xl font-bold">
            Mes rendez-vous
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Saisissez exactement l’email et le numéro de téléphone utilisés lors
            de votre réservation.
          </p>
          <form action={identifyCustomer} className="mt-7 space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                required
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
          <Link
            href="/reservation"
            className="mt-5 block text-center text-sm font-medium underline underline-offset-4"
          >
            Prendre un nouveau rendez-vous
          </Link>
        </section>
      </main>
    )

  const appointments = await prisma.appointment.findMany({
    where: {
      customerIdentityDigest: session.subject,
      status: 'CONFIRMED',
      startsAt: { gt: now },
    },
    orderBy: { startsAt: 'asc' },
  })
  const limits = getBookingDateLimits(now)

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <Link href="/" className="font-heading text-xl font-bold">
          Arbeauté
        </Link>
        <form action={logoutCustomer}>
          <button
            type="submit"
            className="rounded-full border px-4 py-2 text-sm font-medium"
          >
            Se déconnecter
          </button>
        </form>
      </header>
      <section className="mx-auto mt-10 max-w-3xl">
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
                serviceName={appointment.serviceNameSnapshot}
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
  )
}

export default CustomerAppointmentsPage
