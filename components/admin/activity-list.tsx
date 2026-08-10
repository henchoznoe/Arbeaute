import {
  CalendarClock,
  CalendarPlus2,
  CalendarX2,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  type AppointmentActivityItem,
  formatActivityCreatedAt,
  formatActivityMessage,
} from '@/lib/admin/activity'

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
      <p className="rounded-xl bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">
        Aucune activité cliente pour le moment.
      </p>
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
            className={`min-w-0 rounded-xl border p-3 ${isUnread ? 'border-rose-200 bg-rose-50/70' : 'bg-background'}`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${isUnread ? 'bg-rose-100 text-rose-700' : 'bg-muted text-muted-foreground'}`}
                aria-hidden="true"
              >
                <ActivityIcon type={activity.type} />
              </span>
              <div className="min-w-0 flex-1">
                {isUnread ? (
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                    <span className="size-1.5 rounded-full bg-rose-600" />
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
                      href={`/admin/appointments/${activity.appointmentId}`}
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
