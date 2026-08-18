import { formatInTimeZone } from 'date-fns-tz'
import { CalendarClock, ChevronLeft, Copy, UserRound } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AppointmentForm } from '@/components/admin/appointment-form'
import { AppointmentStatusActions } from '@/components/admin/appointment-status-actions'
import { CustomerCallButton } from '@/components/admin/customer-call-button'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import { formatAppointmentDate } from '@/lib/reservation/time'
import { capitalizeFirst, formatPrice } from '@/lib/utils/format'
import type { AppointmentStatus } from '@/prisma/generated/prisma/enums'

interface EditAppointmentPageProps {
  params: Promise<{ id: string }>
}

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

const EditAppointmentPage = ({
  params,
}: Readonly<EditAppointmentPageProps>) => (
  <Suspense fallback={<AdminSkeleton variant="form" maxWidth="max-w-3xl" />}>
    <EditAppointment params={params} />
  </Suspense>
)

const EditAppointment = async ({
  params,
}: Readonly<EditAppointmentPageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { id } = await params
  const appointment = await prisma.appointment.findFirst({
    where: { id },
    include: {
      service: { select: { category: { select: { name: true } } } },
    },
  })
  if (!appointment) notFound()
  const services =
    appointment.status === 'CONFIRMED'
      ? await prisma.service.findMany({
          where: {
            OR: [{ isArchived: false }, { id: appointment.serviceId }],
          },
          orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            priceCents: true,
            category: { select: { name: true } },
          },
        })
      : []

  const date = formatInTimeZone(
    appointment.startsAt,
    RESERVATION_TIME_ZONE,
    'yyyy-MM-dd',
  )
  const time = formatInTimeZone(
    appointment.startsAt,
    RESERVATION_TIME_ZONE,
    'HH:mm',
  )
  const customerName =
    [appointment.customerFirstName, appointment.customerLastName]
      .filter(Boolean)
      .join(' ') || 'cette personne'

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
      >
        <Link href={`/admin?date=${date}`}>
          <ChevronLeft className="size-4" /> Agenda
        </Link>
      </Button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-title font-bold">
            {appointment.status === 'CONFIRMED'
              ? 'Modifier le rendez-vous'
              : 'Détail du rendez-vous'}
          </h1>
          <StatusBadge
            variant={statusVariants[appointment.status]}
            className="mt-2"
          >
            {statusLabels[appointment.status]}
          </StatusBadge>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/appointments/new?duplicate=${appointment.id}`}>
            <Copy className="size-4" /> Dupliquer
          </Link>
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {appointment.status === 'CONFIRMED'
          ? 'Si vous changez de soin, la durée et le prix de ce rendez-vous sont mis à jour automatiquement.'
          : 'Ce rendez-vous n’est plus actif. Vous pouvez le consulter, mais pas le modifier tant que vous ne l’avez pas rétabli.'}
      </p>

      {/* Même trio d'actions que dans la liste du jour — appeler, puis changer
          le statut — pour qu'Arzu n'ait qu'un seul geste à mémoriser. */}
      <section className="mt-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">
          Appeler ou noter ce qui s’est passé
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Chaque changement est daté et conservé dans l’historique des
          modifications.
        </p>
        <CustomerCallButton
          phone={appointment.customerPhone}
          customerName={customerName}
          className="mt-4 w-full sm:w-auto"
        />
        <AppointmentStatusActions
          appointmentId={appointment.id}
          status={appointment.status}
          startsAt={appointment.startsAt}
          className="mt-3"
        />
      </section>

      {appointment.status === 'CONFIRMED' ? (
        <div className="mt-6">
          <AppointmentForm
            key={appointment.id}
            services={services}
            appointment={{
              id: appointment.id,
              serviceId: appointment.serviceId,
              date,
              time,
              firstName: appointment.customerFirstName,
              lastName: appointment.customerLastName,
              email: appointment.customerEmail,
              phone: appointment.customerPhone,
              comment: appointment.comment,
            }}
          />
        </div>
      ) : (
        <section className="mt-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">
                {formatServiceLabel(
                  appointment.serviceNameSnapshot,
                  appointment.service.category?.name,
                )}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {capitalizeFirst(formatAppointmentDate(appointment.startsAt))} ·{' '}
                {formatPrice(appointment.servicePriceCents)}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-start gap-3 border-t pt-5">
            <UserRound className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">{customerName}</p>
              {appointment.customerEmail ? (
                <p className="mt-1 break-all text-muted-foreground">
                  {appointment.customerEmail}
                </p>
              ) : null}
            </div>
          </div>
          {appointment.comment ? (
            <div className="mt-5 border-t pt-5">
              <h3 className="text-sm font-semibold">Commentaire</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {appointment.comment}
              </p>
            </div>
          ) : null}
        </section>
      )}
    </main>
  )
}

export default EditAppointmentPage
