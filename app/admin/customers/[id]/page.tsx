import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  History,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AppointmentStatusActions } from '@/components/admin/appointment-status-actions'
import {
  CustomerProfileForm,
  CustomerQuickActions,
} from '@/components/admin/customer-profile-controls'
import { Button } from '@/components/ui/button'
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
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
      >
        <Link href="/admin/search">
          <ChevronLeft className="size-4" /> Recherche
        </Link>
      </Button>
      <header className="mt-1 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UserRound className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand">Client</p>
            <h1 className="break-words font-heading text-title font-bold">
              {customerName}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Connue depuis le {formatDayDate(customer.firstSeenAt)} · dernière
              activité le {formatDayDate(customer.lastSeenAt)}
            </p>
          </div>
        </div>
        <CustomerQuickActions customerId={customer.id} phone={customer.phone} />
      </header>

      {/* Quatre réponses aux questions qu'Arzu se pose en ouvrant un client,
          à la place de l'énumération des statuts de la base. Les comptages
          détaillés n'ont pas disparu : ils sont descendus avec l'historique,
          où ils sont à leur place. */}
      <section
        className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
        aria-label="L’essentiel de ce client"
      >
        <article className="rounded-2xl border bg-primary/5 p-4">
          <p className="text-2xl font-bold tabular-nums">
            {profile.totalVisits}
          </p>
          <p className="text-xs text-muted-foreground">
            {profile.totalVisits > 1 ? 'visites' : 'visite'}
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-base font-semibold">
            {profile.lastVisitAt
              ? capitalizeFirst(formatDayDate(profile.lastVisitAt))
              : 'Jamais encore'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Dernière venue</p>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-base font-semibold break-words">
            {profile.usualServiceLabel ?? 'Rien d’habituel'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Soin habituel</p>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-base font-semibold">
            {profile.upcoming[0]
              ? capitalizeFirst(
                  formatCompactMoment(profile.upcoming[0].startsAt),
                )
              : 'Rien de prévu'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Revient</p>
        </article>
      </section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <CustomerProfileForm customer={customer} />
        <div className="space-y-5">
          <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-5 text-primary" />
              <h2 className="text-xl font-semibold">Prochains rendez-vous</h2>
            </div>
            <CustomerAppointmentList
              appointments={profile.upcoming}
              emptyTitle="Aucun rendez-vous à venir"
              emptyDescription="Utilisez l’action Ajouter pour préparer le prochain rendez-vous."
            />
          </section>
          <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              <h2 className="text-xl font-semibold">Historique récent</h2>
            </div>
            {/* Les comptages détaillés vivent ici, au contact de ce qu'ils
                comptent. Les absences ne s'affichent que s'il y en a : un
                « 0 » mis en avant est une accusation gratuite. */}
            <p className="mt-2 text-xs text-muted-foreground">
              {profile.totalAppointments} rendez-vous au total ·{' '}
              {profile.statusCounts.CANCELLED} annulé
              {profile.statusCounts.CANCELLED > 1 ? 's' : ''}
              {profile.statusCounts.NO_SHOW > 0
                ? ` · ${profile.statusCounts.NO_SHOW} absence${profile.statusCounts.NO_SHOW > 1 ? 's' : ''}`
                : ''}
            </p>
            <CustomerAppointmentList
              appointments={profile.history}
              emptyTitle="Aucun historique"
              emptyDescription="Les rendez-vous passés, annulés, terminés ou absents apparaîtront ici."
            />
            {profile.totalAppointments >
            profile.upcoming.length + profile.history.length ? (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Affichage limité aux 10 prochains et 30 derniers rendez-vous.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </AdminPage>
  )
}

export default CustomerPage
