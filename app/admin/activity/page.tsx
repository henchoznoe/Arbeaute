import { CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ActivityList } from '@/components/admin/activity-list'
import { ActivityTabs } from '@/components/admin/activity-tabs'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { markAllAppointmentActivitiesRead } from '@/lib/actions/admin-activity'
import { getActivityPage } from '@/lib/admin/activity'
import { getAdminSession } from '@/lib/core/session-cookies'

interface ActivityPageProps {
  searchParams: Promise<{ page?: string }>
}

const parsePage = (value: string | undefined): number => {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

const ActivityPage = ({ searchParams }: Readonly<ActivityPageProps>) => (
  <Suspense fallback={<AdminSkeleton maxWidth="max-w-3xl" />}>
    <ActivityHistory searchParams={searchParams} />
  </Suspense>
)

const ActivityHistory = async ({
  searchParams,
}: Readonly<ActivityPageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const requestedPage = parsePage((await searchParams).page)
  const { activities, unreadCount, page, totalPages, totalCount } =
    await getActivityPage(requestedPage)

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-5 sm:px-8 sm:py-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
      >
        <Link href="/admin">
          <ChevronLeft className="size-4" /> Agenda
        </Link>
      </Button>

      <header className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-brand">Arbeauté</p>
          <h1 className="font-heading text-title font-bold">Activité</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount} action{totalCount > 1 ? 's' : ''} cliente
            {totalCount > 1 ? 's' : ''}
          </p>
        </div>
        {unreadCount > 0 ? (
          <StatusBadge variant="danger" className="shrink-0">
            {unreadCount > 99 ? '99+' : unreadCount} nouvelle
            {unreadCount > 1 ? 's' : ''}
          </StatusBadge>
        ) : null}
      </header>

      <ActivityTabs active="customer" />

      {unreadCount > 0 ? (
        <form action={markAllAppointmentActivitiesRead} className="mt-5">
          <Button type="submit" className="w-full">
            <CheckCheck className="size-4" /> Tout marquer comme lu
          </Button>
        </form>
      ) : null}

      <section className="mt-5" aria-label="Historique des activités clientes">
        <ActivityList activities={activities} showAppointmentLinks />
      </section>

      {totalPages > 1 ? (
        <nav
          aria-label="Pagination de l’activité"
          className="mt-5 grid grid-cols-2 gap-3"
        >
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={`/admin/activity?page=${page - 1}`}>
                <ChevronLeft className="size-4" /> Précédent
              </Link>
            </Button>
          ) : (
            <span aria-hidden="true" />
          )}
          {page < totalPages ? (
            <Button asChild variant="outline">
              <Link href={`/admin/activity?page=${page + 1}`}>
                Suivant <ChevronRight className="size-4" />
              </Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
      {totalPages > 1 ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Page {page} sur {totalPages}
        </p>
      ) : null}
    </main>
  )
}

export default ActivityPage
