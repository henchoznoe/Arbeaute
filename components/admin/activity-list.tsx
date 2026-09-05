import { Activity } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import type { ActivityItem } from '@/lib/admin/activity'
import {
  formatLongDate,
  formatSlotTime,
  getLocalDateKey,
} from '@/lib/reservation/time'

export const ActivityList = ({
  activities,
}: {
  activities: ActivityItem[]
}) => {
  if (!activities.length)
    return (
      <EmptyState
        title="Aucune activité"
        description="Les réservations et les changements apparaîtront ici."
        className="border-0 bg-muted/60 py-6"
      />
    )
  const groups = Map.groupBy(activities, activity =>
    getLocalDateKey(activity.createdAt),
  )
  return (
    <div className="space-y-5">
      {[...groups].map(([date, items]) => (
        <section key={date} aria-label={formatLongDate(items[0].createdAt)}>
          <h3 className="mb-2 text-sm font-semibold">
            {formatLongDate(items[0].createdAt)}
          </h3>
          <ol className="space-y-3">
            {items.map(activity => (
              <li
                key={activity.id}
                className="min-w-0 rounded-xl border bg-card p-3"
              >
                <div className="flex items-start gap-2">
                  <Activity
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{activity.title}</p>
                    <p className="mt-1 break-words text-sm">
                      {activity.subject}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activity.actor} ·{' '}
                      <time dateTime={activity.createdAt.toISOString()}>
                        {formatSlotTime(activity.createdAt)}
                      </time>
                    </p>
                    {activity.details.length ? (
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {activity.details.slice(0, 3).map(detail => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    ) : null}
                    {activity.details.length > 3 ? (
                      <details className="mt-2 text-sm">
                        <summary className="flex min-h-11 cursor-pointer items-center font-medium text-primary">
                          Voir les détails ({activity.details.length - 3})
                        </summary>
                        <ul className="space-y-1 text-muted-foreground">
                          {activity.details.slice(3).map(detail => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                    {activity.href ? (
                      <Link
                        href={activity.href}
                        className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4"
                      >
                        {activity.linkLabel}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
