import { Bell, CheckCheck, List } from 'lucide-react'
import Link from 'next/link'
import { ActivityList } from '@/components/admin/activity-list'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { markAllAppointmentActivitiesRead } from '@/lib/actions/admin-activity'
import type { AppointmentActivityItem } from '@/lib/admin/activity'

export const ActivityOverview = ({
  activities,
  unreadCount,
}: Readonly<{
  activities: AppointmentActivityItem[]
  unreadCount: number
}>) => (
  <section className="mt-4 rounded-2xl border bg-card p-3 sm:mt-6 sm:p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-strong"
          aria-hidden="true"
        >
          <Bell className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">Activité récente</h2>
          <p className="text-xs text-muted-foreground">
            Réservations et changements des clientes
          </p>
        </div>
      </div>
      {unreadCount > 0 ? (
        <StatusBadge variant="danger" className="shrink-0">
          <span aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
          <span className="sr-only">
            {unreadCount} activité{unreadCount > 1 ? 's' : ''} non lue
            {unreadCount > 1 ? 's' : ''}
          </span>
        </StatusBadge>
      ) : null}
    </div>

    <div className="mt-3">
      <ActivityList activities={activities} />
    </div>

    <div
      className={`mt-3 grid gap-2 ${unreadCount > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}
    >
      <Button asChild variant="outline" className="min-w-0">
        <Link href="/admin/activity">
          <List className="size-4 shrink-0" />
          Tout voir
        </Link>
      </Button>
      {unreadCount > 0 ? (
        <form action={markAllAppointmentActivitiesRead}>
          <Button
            type="submit"
            className="w-full min-w-0 px-2 min-[390px]:px-3"
          >
            <CheckCheck className="size-4 shrink-0" />
            Tout marquer comme lu
          </Button>
        </form>
      ) : null}
    </div>
  </section>
)
