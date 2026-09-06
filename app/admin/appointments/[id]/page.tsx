import { formatInTimeZone } from 'date-fns-tz'
import {
  CalendarClock,
  ChevronDown,
  Copy,
  Pencil,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AppointmentEmailStatus } from '@/components/admin/appointment-email-status'
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
  <Suspense fallback={<AdminSkeleton variant="form" />}>
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

  const emailDeliveries = await prisma.emailDelivery.findMany({
    where: { appointmentId: appointment.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      kind: true,
      status: true,
      recipient: true,
      error: true,
      createdAt: true,
    },
  })
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
      .join(' ') || 'Sans nom'
  const serviceLabel = formatServiceLabel(
    appointment.serviceNameSnapshot,
    appointment.service.category?.name,
  )

  return (
    <AdminPage>
      <AdminPageHeader
        backHref={`/admin?date=${date}`}
        backLabel="Agenda"
        icon={CalendarClock}
        title={customerName}
        aside={
          <StatusBadge variant={statusVariants[appointment.status]}>
            {statusLabels[appointment.status]}
          </StatusBadge>
        }
        description={`${capitalizeFirst(formatAppointmentDate(appointment.startsAt))} · ${serviceLabel}`}
      />

      <section className="mt-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">{serviceLabel}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {time} · {formatPrice(appointment.servicePriceCents)}
            </p>
          </div>
          {appointment.customerId ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/admin/customers/${appointment.customerId}`}>
                <UserRound className="size-4" /> Voir le client
              </Link>
            </Button>
          ) : null}
        </div>

        {appointment.customerEmail ? null : (
          <p className="mt-3 rounded-xl bg-warning-subtle p-3 text-xs leading-relaxed text-warning-strong">
            Sans adresse e-mail : aucun message de déplacement ou d’annulation
            ne pourra être envoyé.
          </p>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <CustomerCallButton
            phone={appointment.customerPhone}
            customerName={customerName}
          />
          {appointment.status === 'CONFIRMED' ? (
            <Button asChild>
              <Link href={`/admin/appointments/${appointment.id}/deplacer`}>
                Déplacer le rendez-vous
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-4 border-t pt-4">
          <p className="mb-2 text-sm font-semibold">Noter ce qui s’est passé</p>
          <AppointmentStatusActions
            appointmentId={appointment.id}
            status={appointment.status}
            startsAt={appointment.startsAt}
          />
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/admin/appointments/new?duplicate=${appointment.id}`}>
            <Copy className="size-4" /> Dupliquer
          </Link>
        </Button>
      </div>

      {appointment.status === 'CONFIRMED' ? (
        <details className="group mt-4 rounded-2xl border bg-card">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 font-semibold [&::-webkit-details-marker]:hidden">
            <Pencil className="size-4 text-primary" />
            <span>Modifier les informations</span>
            <ChevronDown className="ml-auto size-4 transition group-open:rotate-180" />
          </summary>
          <div className="border-t p-3 sm:p-5">
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
        </details>
      ) : (
        <section className="mt-4 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Informations conservées</h2>
          <p className="mt-2 break-words text-sm text-muted-foreground">
            {appointment.customerEmail ?? 'Sans adresse e-mail'}
          </p>
          {appointment.comment ? (
            <p className="mt-3 whitespace-pre-wrap border-t pt-3 text-sm text-muted-foreground">
              {appointment.comment}
            </p>
          ) : null}
        </section>
      )}

      <div className="mt-4">
        <AppointmentEmailStatus deliveries={emailDeliveries} />
      </div>
    </AdminPage>
  )
}

export default EditAppointmentPage
