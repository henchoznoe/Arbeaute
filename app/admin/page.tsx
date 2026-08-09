import { formatInTimeZone } from 'date-fns-tz'
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Settings2,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { InstallAppButton } from '@/components/pwa/install-app-button'
import { logoutAdmin } from '@/lib/actions/admin-auth'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import {
  addLocalDays,
  getLocalDateKey,
  getLocalDayBounds,
  getLocalWeekDateKeys,
  isDateKey,
} from '@/lib/reservation/time'

interface AdminPageProps {
  searchParams: Promise<{ date?: string }>
}

const dayTitle = (dateKey: string, long = false) =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: RESERVATION_TIME_ZONE,
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: long ? 'long' : 'short',
  }).format(getLocalDayBounds(dateKey).start)

const formatTime = (date: Date) =>
  formatInTimeZone(date, RESERVATION_TIME_ZONE, 'HH:mm')

const AdminPage = ({ searchParams }: Readonly<AdminPageProps>) => (
  <Suspense fallback={<AdminSkeleton />}>
    <AdminAgenda searchParams={searchParams} />
  </Suspense>
)

const AdminAgenda = async ({ searchParams }: Readonly<AdminPageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const requestedDate = (await searchParams).date
  const today = getLocalDateKey(new Date())
  const anchor =
    requestedDate && isDateKey(requestedDate) ? requestedDate : today
  const weekDays = getLocalWeekDateKeys(anchor)
  const mobileDays = Array.from({ length: 7 }, (_, index) =>
    addLocalDays(anchor, index),
  )
  const queryDays = [...new Set([...weekDays, ...mobileDays])].sort()
  const queryStart = getLocalDayBounds(queryDays[0]).start
  const queryEnd = getLocalDayBounds(queryDays.at(-1) as string).end

  const [appointments, exceptions] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        startsAt: { gte: queryStart, lt: queryEnd },
      },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        customerFirstName: true,
        customerLastName: true,
        customerPhone: true,
        serviceNameSnapshot: true,
        service: {
          select: { color: true, category: { select: { name: true } } },
        },
        source: true,
      },
    }),
    prisma.availabilityException.findMany({
      where: { startsAt: { lt: queryEnd }, endsAt: { gt: queryStart } },
      orderBy: { startsAt: 'asc' },
    }),
  ])

  const appointmentsFor = (dateKey: string) =>
    appointments.filter(
      appointment => getLocalDateKey(appointment.startsAt) === dateKey,
    )
  const exceptionsFor = (dateKey: string) => {
    const bounds = getLocalDayBounds(dateKey)
    return exceptions.filter(
      exception =>
        exception.startsAt < bounds.end && exception.endsAt > bounds.start,
    )
  }
  const appointmentCard = (
    appointment: (typeof appointments)[number],
    compact = false,
  ) => (
    <Link
      key={appointment.id}
      href={`/admin/appointments/${appointment.id}`}
      className={`block rounded-xl border bg-background p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${compact ? 'text-xs' : ''}`}
      style={{ borderLeftColor: appointment.service.color, borderLeftWidth: 4 }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">
          {formatTime(appointment.startsAt)}–{formatTime(appointment.endsAt)}
        </span>
        {appointment.source === 'ADMIN' ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            manuel
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-medium leading-snug">
        {[appointment.customerFirstName, appointment.customerLastName]
          .filter(Boolean)
          .join(' ')}
      </p>
      <p className="mt-0.5 truncate text-muted-foreground">
        {formatServiceLabel(
          appointment.serviceNameSnapshot,
          appointment.service.category?.name,
        )}
      </p>
      {!compact && appointment.customerPhone ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {appointment.customerPhone}
        </p>
      ) : null}
    </Link>
  )

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-8 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-rose-500">Arbeauté</p>
          <h1 className="font-heading text-3xl font-bold">Agenda</h1>
        </div>
        <div className="flex items-center gap-2">
          <InstallAppButton className="min-h-11 rounded-xl border px-4 text-sm font-medium text-muted-foreground no-underline" />
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="min-h-11 rounded-xl border px-4 text-sm font-medium"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </header>

      <nav className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <Link
          href={`/admin/appointments/new?date=${anchor}`}
          className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground sm:col-span-1"
        >
          <Plus className="size-4" /> Nouveau rendez-vous
        </Link>
        <Link
          href="/admin/availability"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium"
        >
          <Clock3 className="size-4" /> Horaires
        </Link>
        <Link
          href="/admin/services"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium"
        >
          <Settings2 className="size-4" /> Prestations
        </Link>
      </nav>

      <section className="mt-6 md:hidden">
        <div className="flex items-center justify-between gap-2 rounded-2xl border bg-card p-2">
          <Link
            href={`/admin?date=${addLocalDays(anchor, -1)}`}
            aria-label="Jour précédent"
            className="grid size-11 place-items-center rounded-xl hover:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="text-center">
            <p className="font-semibold capitalize">{dayTitle(anchor, true)}</p>
            {anchor !== today ? (
              <Link href="/admin" className="text-xs text-primary underline">
                Revenir à aujourd’hui
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">Aujourd’hui</span>
            )}
          </div>
          <Link
            href={`/admin?date=${addLocalDays(anchor, 1)}`}
            aria-label="Jour suivant"
            className="grid size-11 place-items-center rounded-xl hover:bg-muted"
          >
            <ChevronRight className="size-5" />
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          {mobileDays.map((dateKey, dayIndex) => {
            const dailyAppointments = appointmentsFor(dateKey)
            const dailyExceptions = exceptionsFor(dateKey)
            return (
              <section key={dateKey} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold capitalize">
                    {dayIndex === 0
                      ? dateKey === today
                        ? 'Aujourd’hui'
                        : dayTitle(dateKey, true)
                      : dayIndex === 1
                        ? 'Demain'
                        : dayTitle(dateKey, true)}
                  </h2>
                  <Link
                    href={`/admin/appointments/new?date=${dateKey}`}
                    aria-label={`Ajouter un rendez-vous le ${dayTitle(dateKey, true)}`}
                    className="grid size-11 place-items-center rounded-xl bg-muted"
                  >
                    <Plus className="size-4" />
                  </Link>
                </div>
                {dailyExceptions.map(exception => (
                  <div
                    key={exception.id}
                    className={`mt-3 rounded-xl px-3 py-2 text-xs ${exception.type === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-950' : 'bg-amber-100 text-amber-950'}`}
                  >
                    {exception.type === 'AVAILABLE' ? 'Ouverture' : 'Fermeture'}{' '}
                    {formatTime(exception.startsAt)}–
                    {formatTime(exception.endsAt)}
                    {exception.label ? ` · ${exception.label}` : ''}
                  </div>
                ))}
                <div className="mt-3 space-y-2">
                  {dailyAppointments.length ? (
                    dailyAppointments.map(appointment =>
                      appointmentCard(appointment),
                    )
                  ) : (
                    <p className="rounded-xl bg-muted/60 px-3 py-4 text-center text-sm text-muted-foreground">
                      Aucun rendez-vous
                    </p>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </section>

      <section className="mt-7 hidden md:block">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">Semaine</h2>
            <p className="text-sm text-muted-foreground">
              {dayTitle(weekDays[0], true)} – {dayTitle(weekDays[6], true)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin?date=${addLocalDays(anchor, -7)}`}
              aria-label="Semaine précédente"
              className="grid size-10 place-items-center rounded-xl border"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium"
            >
              <CalendarClock className="size-4" /> Aujourd’hui
            </Link>
            <Link
              href={`/admin?date=${addLocalDays(anchor, 7)}`}
              aria-label="Semaine suivante"
              className="grid size-10 place-items-center rounded-xl border"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 overflow-hidden rounded-2xl border bg-card">
          {weekDays.map(dateKey => {
            const dailyAppointments = appointmentsFor(dateKey)
            const dailyExceptions = exceptionsFor(dateKey)
            return (
              <section
                key={dateKey}
                className={`min-h-[28rem] border-r p-2 last:border-r-0 ${dateKey === today ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between gap-1 border-b pb-2">
                  <h3 className="text-sm font-semibold capitalize">
                    {dayTitle(dateKey)}
                  </h3>
                  <Link
                    href={`/admin/appointments/new?date=${dateKey}`}
                    aria-label={`Ajouter le ${dayTitle(dateKey, true)}`}
                    className="grid size-8 place-items-center rounded-lg hover:bg-muted"
                  >
                    <Plus className="size-3.5" />
                  </Link>
                </div>
                <div className="mt-2 space-y-2">
                  {dailyExceptions.map(exception => (
                    <div
                      key={exception.id}
                      className={`rounded-lg px-2 py-1.5 text-[11px] leading-snug ${exception.type === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-950' : 'bg-amber-100 text-amber-950'}`}
                    >
                      {exception.type === 'AVAILABLE' ? 'Ouvert' : 'Fermé'}{' '}
                      {formatTime(exception.startsAt)}–
                      {formatTime(exception.endsAt)}
                    </div>
                  ))}
                  {dailyAppointments.map(appointment =>
                    appointmentCard(appointment, true),
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default AdminPage
