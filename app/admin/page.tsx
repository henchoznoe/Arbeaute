import { formatInTimeZone } from 'date-fns-tz'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ActivityOverview } from '@/components/admin/activity-overview'
import { AdminAgendaView } from '@/components/admin/admin-agenda-view'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AppointmentStatusActions } from '@/components/admin/appointment-status-actions'
import { DashboardMetrics } from '@/components/admin/dashboard-metrics'
import { StatusBadge } from '@/components/ui/status-badge'
import { getActivityOverview } from '@/lib/admin/activity'
import { buildAdminTimelineDay } from '@/lib/admin/agenda-timeline'
import { buildDashboardMetrics } from '@/lib/admin/dashboard-metrics'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import {
  addLocalDays,
  getLocalDateKey,
  getLocalDayBounds,
  getLocalDayOfWeek,
  getLocalWeekDateKeys,
  isDateKey,
} from '@/lib/reservation/time'
import type { AppointmentStatus } from '@/prisma/generated/prisma/enums'

interface AdminPageProps {
  searchParams: Promise<{ date?: string }>
}

const SHORT_DAY_LABELS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']

const dayTitle = (dateKey: string, long = false) =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: RESERVATION_TIME_ZONE,
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: long ? 'long' : 'short',
  }).format(getLocalDayBounds(dateKey).start)

const formatTime = (date: Date) =>
  formatInTimeZone(date, RESERVATION_TIME_ZONE, 'HH:mm')

const statusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: 'Confirmé',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  NO_SHOW: 'Absence',
}

const statusVariants = {
  CONFIRMED: 'success',
  COMPLETED: 'info',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
} as const

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
  const queryStart = getLocalDayBounds(weekDays[0]).start
  const queryEnd = getLocalDayBounds(weekDays.at(-1) as string).end

  const [appointments, exceptions, weekly, activityOverview] =
    await Promise.all([
      prisma.appointment.findMany({
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
          occupiedStartsAt: { lt: queryEnd },
          occupiedEndsAt: { gt: queryStart },
        },
        orderBy: { startsAt: 'asc' },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          occupiedStartsAt: true,
          occupiedEndsAt: true,
          preparationMinutes: true,
          cleanupMinutes: true,
          serviceDurationMinutes: true,
          servicePriceCents: true,
          customerFirstName: true,
          customerLastName: true,
          customerPhone: true,
          serviceNameSnapshot: true,
          service: {
            select: { color: true, category: { select: { name: true } } },
          },
          source: true,
          status: true,
        },
      }),
      prisma.availabilityException.findMany({
        where: { startsAt: { lt: queryEnd }, endsAt: { gt: queryStart } },
        orderBy: { startsAt: 'asc' },
      }),
      prisma.weeklyAvailability.findMany({
        orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
        select: { dayOfWeek: true, startMinute: true, endMinute: true },
      }),
      getActivityOverview(),
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
    dateKey: string,
    compact = false,
  ) => (
    <article
      key={appointment.id}
      className={`block rounded-xl border bg-background p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${compact ? 'text-xs' : ''}`}
      style={{ borderLeftColor: appointment.service.color, borderLeftWidth: 4 }}
    >
      <Link href={`/admin/appointments/${appointment.id}?date=${dateKey}`}>
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
      </Link>
      <StatusBadge
        variant={statusVariants[appointment.status]}
        className="mt-2"
      >
        {statusLabels[appointment.status]}
      </StatusBadge>
      {!compact && appointment.customerPhone ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {appointment.customerPhone}
        </p>
      ) : null}
      <AppointmentStatusActions
        appointmentId={appointment.id}
        status={appointment.status}
        startsAt={appointment.startsAt}
        compact
        className="mt-2"
      />
    </article>
  )
  const timelineDays = weekDays.map(dateKey => {
    const dayOfWeek = getLocalDayOfWeek(dateKey)
    return buildAdminTimelineDay({
      dateKey,
      today,
      label: dayTitle(dateKey, true),
      shortLabel: SHORT_DAY_LABELS[dayOfWeek],
      weekly,
      exceptions,
      appointments: appointments.map(appointment => ({
        id: appointment.id,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        occupiedStartsAt: appointment.occupiedStartsAt,
        occupiedEndsAt: appointment.occupiedEndsAt,
        preparationMinutes: appointment.preparationMinutes,
        cleanupMinutes: appointment.cleanupMinutes,
        customerName: [
          appointment.customerFirstName,
          appointment.customerLastName,
        ]
          .filter(Boolean)
          .join(' '),
        customerPhone: appointment.customerPhone,
        serviceLabel: formatServiceLabel(
          appointment.serviceNameSnapshot,
          appointment.service.category?.name,
        ),
        serviceColor: appointment.service.color,
        source: appointment.source,
        status: appointment.status,
      })),
    })
  })
  const dashboardMetrics = buildDashboardMetrics({
    anchorDateKey: anchor,
    dateKeys: weekDays,
    appointments,
    weekly,
    exceptions,
  })
  const periodLabel = `${dayTitle(weekDays[0])} – ${dayTitle(weekDays.at(-1) as string)}`

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-8 sm:py-8">
      <header>
        <div>
          <p className="text-sm font-medium text-rose-500">Arbeauté</p>
          <h1 className="font-heading text-3xl font-bold">Agenda</h1>
        </div>
      </header>

      <DashboardMetrics
        metrics={dashboardMetrics}
        periodLabel={periodLabel}
        selectedDayLabel={dayTitle(anchor, true)}
      />

      <div className="hidden md:block">
        <ActivityOverview {...activityOverview} />
      </div>

      <AdminAgendaView
        anchor={anchor}
        today={today}
        previousWeek={addLocalDays(anchor, -7)}
        nextWeek={addLocalDays(anchor, 7)}
        days={timelineDays}
        desktopDays={weekDays.map(dateKey => {
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
                  className="grid size-11 place-items-center rounded-xl hover:bg-muted"
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
                  appointmentCard(appointment, dateKey, true),
                )}
              </div>
            </section>
          )
        })}
      />
    </main>
  )
}

export default AdminPage
