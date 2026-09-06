import { BadgeCheck } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminAgendaView } from '@/components/admin/admin-agenda-view'
import { AdminPage as AdminPageShell } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { DashboardMetrics } from '@/components/admin/dashboard-metrics'
import { getAgendaSettings } from '@/lib/admin/agenda-settings'
import { buildAdminTimelineDay } from '@/lib/admin/agenda-timeline'
import { getAdminAttentionSummary } from '@/lib/admin/attention'
import { buildDashboardMetrics } from '@/lib/admin/dashboard-metrics'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { formatCalendarDayTitle } from '@/lib/reservation/calendar-view'
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

  const now = new Date()
  const [appointments, exceptions, weekly, agendaSettings, attention] =
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
      getAgendaSettings(),
      getAdminAttentionSummary(),
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

  const nextAppointmentId = appointments.find(
    appointment =>
      appointment.status === 'CONFIRMED' &&
      appointment.startsAt >= now &&
      getLocalDateKey(appointment.startsAt) === today,
  )?.id

  return (
    <AdminPageShell>
      <header className="flex min-h-11 items-center justify-between gap-3 border-b pb-3">
        <h1 className="font-heading text-title font-bold">Agenda</h1>
        {attention.totalCount > 0 ? (
          <Link
            href="/admin/a-traiter"
            role="status"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-warning-soft px-3 text-sm font-semibold text-warning-strong transition hover:bg-warning-line focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <BadgeCheck className="size-4" />
            {attention.totalCount} à traiter
          </Link>
        ) : null}
      </header>

      <AdminAgendaView
        anchor={anchor}
        today={today}
        previousWeek={addLocalDays(anchor, -7)}
        nextWeek={addLocalDays(anchor, 7)}
        days={timelineDays}
        visibleDays={agendaSettings.visibleDays}
        nextAppointmentId={nextAppointmentId}
      />

      <DashboardMetrics
        metrics={dashboardMetrics}
        anchor={anchor}
        dayCounts={Object.fromEntries(
          timelineDays.map(day => [
            day.dateKey,
            day.appointments.filter(
              a => getLocalDateKey(a.startsAt) === day.dateKey,
            ).length,
          ]),
        )}
        periodLabel={periodLabel}
        selectedDayLabel={formatCalendarDayTitle(anchor, true)}
      />
    </AdminPageShell>
  )
}

export default AdminPage
