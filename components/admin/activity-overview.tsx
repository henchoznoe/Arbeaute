import { Bell, CheckCheck, List } from 'lucide-react'
import Link from 'next/link'
import { ActivityList } from '@/components/admin/activity-list'
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
          className="grid size-9 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-700"
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
        <span className="shrink-0 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">
          <span aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
          <span className="sr-only">
            {unreadCount} activité{unreadCount > 1 ? 's' : ''} non lue
            {unreadCount > 1 ? 's' : ''}
          </span>
        </span>
      ) : null}
    </div>

    <div className="mt-3">
      <ActivityList activities={activities} />
    </div>

    <div
      className={`mt-3 grid gap-2 ${unreadCount > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}
    >
      <Link
        href="/admin/activity"
        className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 text-center text-sm font-medium"
      >
        <List className="size-4 shrink-0" />
        Tout voir
      </Link>
      {unreadCount > 0 ? (
        <form action={markAllAppointmentActivitiesRead}>
          <button
            type="submit"
            className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-primary px-2 text-center text-xs font-medium text-primary-foreground min-[390px]:px-3 min-[390px]:text-sm"
          >
            <CheckCheck className="size-4 shrink-0" />
            Tout marquer comme lu
          </button>
        </form>
      ) : null}
    </div>
  </section>
)
