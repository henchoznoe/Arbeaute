import { Activity, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ActivityList } from '@/components/admin/activity-list'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { Button } from '@/components/ui/button'
import {
  type ActivityTopic,
  activityTopics,
  getActivityPage,
} from '@/lib/admin/activity'
import { getAdminSession } from '@/lib/core/session-cookies'

type Props = { searchParams: Promise<{ page?: string; topic?: string }> }
const History = async ({ searchParams }: Props) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const requested = await searchParams
  const topic =
    requested.topic && Object.hasOwn(activityTopics, requested.topic)
      ? (requested.topic as ActivityTopic)
      : 'all'
  const { activities, page, totalPages, totalCount } = await getActivityPage(
    Number(requested.page ?? 1),
    topic,
  )
  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin"
        backLabel="Agenda"
        title="Activité"
        icon={Activity}
        description={`${totalCount} événement${totalCount > 1 ? 's' : ''} · Réservations et changements au même endroit`}
      />
      <nav
        aria-label="Filtrer l’activité par sujet"
        className="mt-5 flex flex-wrap gap-2"
      >
        {Object.entries(activityTopics).map(([key, label]) => (
          <Button
            key={key}
            asChild
            variant={topic === key ? 'default' : 'outline'}
          >
            <Link
              href={`/admin/activity?topic=${key}`}
              aria-current={topic === key ? 'page' : undefined}
            >
              {label}
            </Link>
          </Button>
        ))}
      </nav>
      <section className="mt-5" aria-label="Historique de l’activité">
        <ActivityList activities={activities} />
      </section>
      {totalPages > 1 ? (
        <>
          <nav
            aria-label="Pagination de l’activité"
            className="mt-5 grid grid-cols-2 gap-3"
          >
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={`/admin/activity?topic=${topic}&page=${page - 1}`}>
                  <ChevronLeft className="size-4" /> Précédent
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {page < totalPages ? (
              <Button asChild variant="outline">
                <Link href={`/admin/activity?topic=${topic}&page=${page + 1}`}>
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
export default function ActivityPage(props: Props) {
  return (
    <Suspense fallback={<AdminSkeleton variant="list" />}>
      <History {...props} />
    </Suspense>
  )
}
