import {
  CalendarClock,
  CalendarPlus2,
  CalendarX2,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import {
  type AppointmentActivityItem,
  formatActivityCreatedAt,
  formatActivityMessage,
} from '@/lib/admin/activity'
import { getLocalDateKey } from '@/lib/reservation/time'

const ActivityIcon = ({
  type,
}: Readonly<{ type: AppointmentActivityItem['type'] }>) => {
  const className = 'size-4'
  if (type === 'RESCHEDULED') return <CalendarClock className={className} />
  if (type === 'CANCELLED') return <CalendarX2 className={className} />
  return <CalendarPlus2 className={className} />
}

export const ActivityList = ({
  activities,
  showAppointmentLinks = false,
}: Readonly<{
  activities: AppointmentActivityItem[]
  showAppointmentLinks?: boolean
}>) => {
  if (!activities.length)
    return (
      <EmptyState
        title="Aucune activité cliente"
        description="Les nouvelles réservations et modifications apparaîtront ici."
        className="border-0 bg-muted/60 py-6"
      />
    )

  return (
    <ol className="space-y-2">
      {activities.map(activity => {
        const isUnread = activity.readAt === null
        const canOpenAppointment =
          showAppointmentLinks && activity.appointment?.status === 'CONFIRMED'
        return (
          <li
            key={activity.id}
            className={`min-w-0 rounded-xl border p-3 ${isUnread ? 'border-brand-line bg-brand-subtle/70' : 'bg-background'}`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${isUnread ? 'bg-brand-soft text-brand-strong' : 'bg-muted text-muted-foreground'}`}
                aria-hidden="true"
              >
                <ActivityIcon type={activity.type} />
              </span>
              <div className="min-w-0 flex-1">
                {isUnread ? (
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-strong">
                    <span className="size-1.5 rounded-full bg-brand-strong" />
                    Nouveau
                  </p>
                ) : null}
                <p className="break-words text-sm leading-relaxed">
                  {formatActivityMessage(activity)}
                </p>
                <div className="mt-2 flex min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <time
                    dateTime={activity.createdAt.toISOString()}
                    className="text-xs text-muted-foreground"
                  >
                    Action le {formatActivityCreatedAt(activity.createdAt)}
                  </time>
                  {canOpenAppointment ? (
                    <Link
                      href={`/admin/appointments/${activity.appointmentId}?date=${getLocalDateKey(activity.appointmentStartsAt)}`}
                      className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary"
                    >
                      Voir le rendez-vous
                      <ChevronRight className="size-3.5" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
