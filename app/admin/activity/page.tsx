import { Activity, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ActivityList } from '@/components/admin/activity-list'
import { ActivityTabs } from '@/components/admin/activity-tabs'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
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
  <Suspense fallback={<AdminSkeleton variant="list" />}>
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
    <AdminPage>
      <AdminPageHeader
        backHref="/admin"
        backLabel="Agenda"
        eyebrow="Arbeauté"
        title="Activité"
        icon={Activity}
        description={`${totalCount} action${totalCount > 1 ? 's' : ''} venue${totalCount > 1 ? 's' : ''} du site`}
        aside={
          unreadCount > 0 ? (
            <StatusBadge variant="danger" className="shrink-0">
              {unreadCount > 99 ? '99+' : unreadCount} nouvelle
              {unreadCount > 1 ? 's' : ''}
            </StatusBadge>
          ) : null
        }
        actions={
          unreadCount > 0 ? (
            <form action={markAllAppointmentActivitiesRead}>
              <Button type="submit">
                <CheckCheck className="size-4" /> Tout marquer comme lu
              </Button>
            </form>
          ) : null
        }
      />

      <ActivityTabs active="customer" />

      <section className="mt-5" aria-label="Historique de l’activité">
        <ActivityList activities={activities} showAppointmentLinks />
      </section>

      {totalPages > 1 ? (
        <>
          <nav
            aria-label="Pagination de l’activité"
            className="mt-5 grid grid-cols-2 gap-3 sm:mx-auto sm:max-w-md"
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
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
        </>
      ) : null}
    </AdminPage>
  )
}

export default ActivityPage
