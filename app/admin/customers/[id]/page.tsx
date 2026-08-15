import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  History,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AppointmentStatusActions } from '@/components/admin/appointment-status-actions'
import {
  CustomerDuplicateList,
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
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { formatServiceLabel } from '@/lib/reservation/service-label'
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

const formatMoment = (date: Date): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: RESERVATION_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: RESERVATION_TIME_ZONE,
    dateStyle: 'long',
  }).format(date)

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
                <span className="block text-sm font-semibold capitalize">
                  {formatMoment(appointment.startsAt)}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {formatServiceLabel(
                    appointment.serviceNameSnapshot,
                    appointment.service.category?.name,
                  )}{' '}
                  ·{' '}
                  {(appointment.servicePriceCents / 100).toLocaleString(
                    'fr-CH',
                  )}{' '}
                  CHF
                </span>
                <span className="mt-2 block">
                  <StatusBadge variant={statusVariants[appointment.status]}>
                    {statusLabels[appointment.status]}
                  </StatusBadge>
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
  <Suspense fallback={<AdminSkeleton maxWidth="max-w-5xl" />}>
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
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-5 sm:px-8 sm:py-8">
      <Link
        href="/admin/search"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Recherche
      </Link>
      <header className="mt-2 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UserRound className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-rose-500">Fiche cliente</p>
            <h1 className="break-words font-heading text-3xl leading-tight font-bold">
              {customerName}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Cliente depuis le {formatDate(customer.firstSeenAt)} · dernière
              activité le {formatDate(customer.lastSeenAt)}
            </p>
          </div>
        </div>
        <CustomerQuickActions customerId={customer.id} phone={customer.phone} />
      </header>

      <section
        className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5"
        aria-label="Indicateurs cliente"
      >
        {Object.entries(statusLabels).map(([status, label]) => (
          <article key={status} className="rounded-2xl border bg-card p-4">
            <p className="text-2xl font-bold tabular-nums">
              {profile.statusCounts[status as AppointmentStatus]}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </article>
        ))}
        <article className="col-span-2 rounded-2xl border bg-primary/5 p-4 sm:col-span-1">
          <p className="text-2xl font-bold tabular-nums">
            {profile.totalVisits}
          </p>
          <p className="text-xs text-muted-foreground">Visites réalisées</p>
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

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <CustomerDuplicateList
          targetId={customer.id}
          duplicates={profile.duplicates}
        />
        <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Confidentialité</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            L’anonymisation reste centralisée dans l’écran sécurisé des données.
            Elle affiche le nombre exact de rendez-vous avant toute
            confirmation.
          </p>
          <Link
            href="/admin/data"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-4 text-sm font-medium transition hover:bg-muted"
          >
            Gérer l’anonymisation
          </Link>
        </section>
      </div>
    </main>
  )
}

export default CustomerPage
