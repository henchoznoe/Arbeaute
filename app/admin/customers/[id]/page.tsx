import { CalendarClock, ChevronRight, History, UserRound } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AppointmentStatusActions } from '@/components/admin/appointment-status-actions'
import {
  CustomerProfileForm,
  CustomerQuickActions,
} from '@/components/admin/customer-profile-controls'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  type AdminCustomerAppointment,
  getAdminCustomerProfile,
} from '@/lib/admin/customer-profile'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import { formatCompactMoment, formatDayDate } from '@/lib/reservation/time'
import { capitalizeFirst, formatPrice } from '@/lib/utils/format'
import type { AppointmentStatus } from '@/prisma/generated/prisma/enums'

interface CustomerPageProps {
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

const CustomerAppointmentList = ({
  appointments,
  emptyTitle,
  emptyDescription,
}: Readonly<{
  appointments: AdminCustomerAppointment[]
  emptyTitle: string
  emptyDescription: string
}>) => {
  if (!appointments.length)
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className="mt-3 py-7"
      />
    )
  return (
    <ol className="mt-3 space-y-2">
      {appointments.map(appointment => (
        <li key={appointment.id}>
          <article className="rounded-2xl border bg-background p-3">
            <Link
              href={`/admin/appointments/${appointment.id}`}
              className="flex min-h-11 items-start gap-3 transition hover:text-primary"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {capitalizeFirst(formatCompactMoment(appointment.startsAt))}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {formatServiceLabel(
                    appointment.serviceNameSnapshot,
                    appointment.service.category?.name,
                  )}{' '}
                  · {formatPrice(appointment.servicePriceCents)}
                </span>
                <span className="mt-2 block">
                  <StatusBadge variant={statusVariants[appointment.status]}>
                    {statusLabels[appointment.status]}
                  </StatusBadge>
                  {/* Un rendez-vous ancien, saisi avant que l'adresse ne
                      devienne obligatoire : aucun message ne peut l'atteindre. */}
                  {appointment.customerEmail ? null : (
                    <span className="ml-2 text-xs text-muted-foreground">
                      Sans adresse e-mail
                    </span>
                  )}
                </span>
              </span>
              <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground" />
            </Link>
            <AppointmentStatusActions
              appointmentId={appointment.id}
              status={appointment.status}
              startsAt={appointment.startsAt}
              compact
              className="mt-2 border-t pt-3"
            />
          </article>
        </li>
      ))}
    </ol>
  )
}

const CustomerPage = ({ params }: Readonly<CustomerPageProps>) => (
  <Suspense fallback={<AdminSkeleton variant="form" />}>
    <CustomerProfile params={params} />
  </Suspense>
)

const CustomerProfile = async ({ params }: Readonly<CustomerPageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { id } = await params
  const profile = await getAdminCustomerProfile(prisma, id)
  if (!profile) notFound()
  const { customer } = profile
  const customerName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(' ')

  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/search"
        backLabel="Recherche"
        icon={UserRound}
        title={customerName}
        description={`Client depuis le ${formatDayDate(customer.firstSeenAt)} · dernière activité le ${formatDayDate(customer.lastSeenAt)}`}
      />
      <div className="rounded-b-2xl border-x border-b bg-card px-4 pb-4">
        <CustomerQuickActions customerId={customer.id} phone={customer.phone} />
      </div>

      <section className="mt-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Prochains rendez-vous</h2>
        </div>
        <CustomerAppointmentList
          appointments={profile.upcoming}
          emptyTitle="Aucun rendez-vous à venir"
          emptyDescription="Utilisez « Ajouter un rendez-vous » pour préparer la prochaine visite."
        />
      </section>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <CustomerProfileForm customer={customer} />
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <History className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Historique récent</h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {profile.totalAppointments} rendez-vous au total
            {profile.totalVisits > 0
              ? ` · ${profile.totalVisits} visite${profile.totalVisits > 1 ? 's' : ''}`
              : ''}
            {profile.statusCounts.CANCELLED > 0
              ? ` · ${profile.statusCounts.CANCELLED} annulé${profile.statusCounts.CANCELLED > 1 ? 's' : ''}`
              : ''}
            {profile.statusCounts.NO_SHOW > 0
              ? ` · ${profile.statusCounts.NO_SHOW} absence${profile.statusCounts.NO_SHOW > 1 ? 's' : ''}`
              : ''}
          </p>
          {profile.usualServiceLabel ? (
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">Soin habituel :</span>{' '}
              {profile.usualServiceLabel}
            </p>
          ) : null}
          <CustomerAppointmentList
            appointments={profile.history}
            emptyTitle="Aucun historique"
            emptyDescription="Les rendez-vous passés apparaîtront ici."
          />
          {profile.totalAppointments >
          profile.upcoming.length + profile.history.length ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Affichage limité aux 10 prochains et 30 derniers rendez-vous.
            </p>
          ) : null}
        </section>
      </div>
    </AdminPage>
  )
}

export default CustomerPage
