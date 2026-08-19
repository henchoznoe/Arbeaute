import { formatInTimeZone } from 'date-fns-tz'
import { CalendarClock, ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ActivityOverview } from '@/components/admin/activity-overview'
import { AdminAgendaView } from '@/components/admin/admin-agenda-view'
import { AdminPage as AdminPageShell } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { DashboardMetrics } from '@/components/admin/dashboard-metrics'
import { NextAppointmentCard } from '@/components/admin/next-appointment-card'
import { getActivityOverview } from '@/lib/admin/activity'
import { getAgendaSettings } from '@/lib/admin/agenda-settings'
import { buildAdminTimelineDay } from '@/lib/admin/agenda-timeline'
import { buildDashboardMetrics } from '@/lib/admin/dashboard-metrics'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { formatCalendarDayTitle } from '@/lib/reservation/calendar-view'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { getPendingLateRequestCount } from '@/lib/reservation/late-requests'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import {
  addLocalDays,
  getLocalDateKey,
  getLocalDayBounds,
  getLocalDayOfWeek,
  getLocalWeekDateKeys,
  isDateKey,
} from '@/lib/reservation/time'

interface AdminPageProps {
  searchParams: Promise<{ date?: string }>
}

const SHORT_DAY_LABELS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']

const formatTime = (date: Date) =>
  formatInTimeZone(date, RESERVATION_TIME_ZONE, 'HH:mm')

const AdminPage = ({ searchParams }: Readonly<AdminPageProps>) => (
  <Suspense fallback={<AdminSkeleton variant="agenda" />}>
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

  // Une requête bornée de plus, jamais une par jour : le prochain rendez-vous
  // doit rester juste même quand Arzu consulte une autre semaine.
  const now = new Date()
  const [
    appointments,
    exceptions,
    weekly,
    activityOverview,
    nextAppointment,
    agendaSettings,
    pendingRequestCount,
  ] = await Promise.all([
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
        customerId: true,
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
    prisma.appointment.findFirst({
      where: { status: 'CONFIRMED', startsAt: { gte: now } },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        startsAt: true,
        customerFirstName: true,
        customerLastName: true,
        serviceNameSnapshot: true,
        service: { select: { category: { select: { name: true } } } },
      },
    }),
    getAgendaSettings(),
    getPendingLateRequestCount(),
  ])

  const timelineDays = weekDays.map(dateKey => {
    const dayOfWeek = getLocalDayOfWeek(dateKey)
    return buildAdminTimelineDay({
      dateKey,
      today,
      label: formatCalendarDayTitle(dateKey, true),
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
        customerId: appointment.customerId,
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
  const periodLabel = `${formatCalendarDayTitle(weekDays[0])} – ${formatCalendarDayTitle(weekDays.at(-1) as string)}`

  const nextAppointmentDateKey = nextAppointment
    ? getLocalDateKey(nextAppointment.startsAt)
    : null

  return (
    <AdminPageShell>
      <header className="mb-2 flex items-baseline gap-2 border-b pb-5">
        <h1 className="font-heading text-title font-bold">Agenda</h1>
        <p className="text-sm font-medium text-brand">Arbeauté</p>
      </header>

      {/* Une demande se décide à l'heure près : elle ne peut pas attendre
          qu'Arzu pense à ouvrir un autre écran. */}
      {pendingRequestCount > 0 ? (
        <Link
          href="/admin/demandes"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition hover:border-primary"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Clock className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">
              {pendingRequestCount === 1
                ? 'Une demande attend votre réponse'
                : `${pendingRequestCount} demandes attendent votre réponse`}
            </span>
            <span className="block text-sm text-muted-foreground">
              Des heures trop proches pour être réservées en ligne. Rien n’est
              réservé tant que vous n’avez pas répondu.
            </span>
          </span>
          <ChevronRight className="ml-auto size-5 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

      {nextAppointment && nextAppointmentDateKey ? (
        <NextAppointmentCard
          id={nextAppointment.id}
          startsAt={nextAppointment.startsAt.toISOString()}
          dateKey={nextAppointmentDateKey}
          timeLabel={formatTime(nextAppointment.startsAt)}
          dayLabel={formatCalendarDayTitle(nextAppointmentDateKey, true)}
          isToday={nextAppointmentDateKey === today}
          customerName={
            [
              nextAppointment.customerFirstName,
              nextAppointment.customerLastName,
            ]
              .filter(Boolean)
              .join(' ') || 'Sans nom'
          }
          serviceLabel={formatServiceLabel(
            nextAppointment.serviceNameSnapshot,
            nextAppointment.service.category?.name,
          )}
        />
      ) : (
        /* Vide, ce bloc occupait 230 px avant la bande de semaine : le plus
           de place pour ce qui a le moins à dire. Et sa phrase prétendait
           qu'aucune réservation n'avait jamais eu lieu, alors qu'elle
           constate seulement qu'il ne reste rien à venir. */
        <p className="mt-4 flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          <CalendarClock className="size-4 shrink-0 text-primary" />
          Plus aucun rendez-vous confirmé à venir.
        </p>
      )}

      <AdminAgendaView
        anchor={anchor}
        today={today}
        previousWeek={addLocalDays(anchor, -7)}
        nextWeek={addLocalDays(anchor, 7)}
        days={timelineDays}
        visibleDays={agendaSettings.visibleDays}
      />

      {/* Les indicateurs et l'activité passent après la journée : ils se
          consultent au mieux une fois par semaine, l'agenda tous les jours. */}
      <DashboardMetrics
        metrics={dashboardMetrics}
        periodLabel={periodLabel}
        selectedDayLabel={formatCalendarDayTitle(anchor, true)}
      />

      {/* Plus de `hidden md:block` : sur téléphone, Arzu ne voyait jamais les
          réservations et annulations depuis son agenda. */}
      <ActivityOverview {...activityOverview} />
    </AdminPageShell>
  )
}

export default AdminPage
