import { CalendarClock } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { CustomerCallButton } from '@/components/admin/customer-call-button'
import { RescheduleForm } from '@/components/admin/reschedule-form'
import { Button } from '@/components/ui/button'
import { formControlClass } from '@/components/ui/form-field'
import { findAppointmentConflicts } from '@/lib/admin/conflicts'
import { rankRescheduleSlots } from '@/lib/admin/reschedule'
import { isEmailConfigured } from '@/lib/core/env'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { getAdminRescheduleSlots } from '@/lib/reservation/availability'
import { formatCalendarDayTitle } from '@/lib/reservation/calendar-view'
import {
  addLocalDays,
  formatAppointmentDate,
  formatSlotTime,
  getLocalDateKey,
  isDateKey,
} from '@/lib/reservation/time'
import { formatPrice } from '@/lib/utils/format'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ date?: string }>
}

const Reschedule = async ({ params, searchParams }: Props) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { id } = await params
  const appointment = await prisma.appointment.findUnique({ where: { id } })
  if (!appointment) notFound()
  if (appointment.status !== 'CONFIRMED') redirect(`/admin/appointments/${id}`)
  const now = new Date()
  const today = getLocalDateKey(now)
  const currentDate = getLocalDateKey(appointment.startsAt)
  const requested = (await searchParams).date
  const from =
    requested && isDateKey(requested)
      ? requested < today
        ? today
        : requested
      : currentDate < today
        ? today
        : currentDate
  const to = addLocalDays(from, 6)
  const [available, neighbors] = await Promise.all([
    getAdminRescheduleSlots({
      database: prisma,
      appointment,
      fromDateKey: from,
      toDateKey: to,
      now,
    }),
    prisma.appointment.findMany({
      where: {
        id: { not: id },
        status: 'CONFIRMED',
        occupiedStartsAt: { lt: appointment.occupiedEndsAt },
        occupiedEndsAt: { gt: appointment.occupiedStartsAt },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        occupiedStartsAt: true,
        occupiedEndsAt: true,
        status: true,
        customerFirstName: true,
        customerLastName: true,
      },
    }),
  ])
  const conflicts = findAppointmentConflicts([
    appointment,
    ...neighbors,
  ]).filter(c => c.firstId === id || c.secondId === id)
  const name =
    [appointment.customerFirstName, appointment.customerLastName]
      .filter(Boolean)
      .join(' ') || 'Sans nom'
  return (
    <AdminPage>
      <AdminPageHeader
        backHref={`/admin/appointments/${id}`}
        backLabel="Rendez-vous"
        title="Déplacer le rendez-vous"
        icon={CalendarClock}
        description="Convenez d’une nouvelle heure avec la personne, puis confirmez le déplacement."
      />
      <section className="mt-4 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">{name}</h2>
        <p>
          {formatAppointmentDate(appointment.startsAt)}–
          {formatSlotTime(appointment.endsAt)}
        </p>
        <p className="text-sm text-muted-foreground">
          {appointment.serviceNameSnapshot} ·{' '}
          {appointment.serviceDurationMinutes} min ·{' '}
          {formatPrice(appointment.servicePriceCents)}
        </p>
        {conflicts.map(c => {
          const other = neighbors.find(
            a => a.id === (c.firstId === id ? c.secondId : c.firstId),
          )
          return other ? (
            <p key={other.id} className="mt-3 text-sm text-destructive">
              {c.buffersOnly
                ? 'Installation ou rangement : se superpose à '
                : 'Se superpose à '}
              {[other.customerFirstName, other.customerLastName]
                .filter(Boolean)
                .join(' ')}
              , {formatAppointmentDate(other.startsAt)}–
              {formatSlotTime(other.endsAt)}.
            </p>
          ) : null
        })}
        <CustomerCallButton
          phone={appointment.customerPhone}
          customerName={name}
          className="mt-3 w-full"
        />
      </section>
      <form className="mt-5 grid gap-2 sm:grid-cols-2">
        <label className="text-sm font-medium" htmlFor="reschedule-date">
          Chercher à partir du
          <input
            id="reschedule-date"
            type="date"
            name="date"
            required
            min={today}
            defaultValue={from}
            className={`${formControlClass} mt-1`}
          />
        </label>
        <Button type="submit" variant="outline" className="self-end">
          Chercher des heures
        </Button>
      </form>
      <p className="mt-2 text-sm text-muted-foreground">
        Sept jours à partir du {formatCalendarDayTitle(from, true)}.
      </p>
      <RescheduleForm
        appointmentId={id}
        expectedStartsAt={appointment.startsAt.toISOString()}
        slots={rankRescheduleSlots(available, appointment.startsAt)}
        emailExpected={Boolean(appointment.customerEmail && isEmailConfigured)}
      />
      <Button asChild variant="outline" className="mt-4 w-full">
        <Link
          href={`/admin/appointments/${id}/deplacer?date=${addLocalDays(from, 7)}`}
        >
          Chercher les sept jours suivants
        </Link>
      </Button>
    </AdminPage>
  )
}

export default function ReschedulePage(props: Props) {
  return (
    <Suspense fallback={<AdminSkeleton variant="form" />}>
      <Reschedule {...props} />
    </Suspense>
  )
}
