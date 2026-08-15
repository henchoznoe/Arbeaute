'use client'

import { AlertTriangle, Plus } from 'lucide-react'
import Link from 'next/link'
import { AppointmentStatusActions } from '@/components/admin/appointment-status-actions'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  type AdminTimelineDay,
  formatTimelineMinute,
  getFreeTimelineStarts,
  type TimelineInterval,
} from '@/lib/admin/agenda-timeline'

const PIXELS_PER_MINUTE = 1.5

const statusLabels = {
  CONFIRMED: 'Confirmé',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  NO_SHOW: 'Absence',
} as const

const statusVariants = {
  CONFIRMED: 'success',
  COMPLETED: 'info',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
} as const

const positionStyle = (
  interval: TimelineInterval,
  timelineStartMinute: number,
) => ({
  top: (interval.startMinute - timelineStartMinute) * PIXELS_PER_MINUTE,
  height: Math.max(
    2,
    (interval.endMinute - interval.startMinute) * PIXELS_PER_MINUTE,
  ),
})

export const AdminDayTimeline = ({
  day,
}: Readonly<{ day: AdminTimelineDay }>) => {
  const freeStarts = getFreeTimelineStarts(day)
  const height =
    (day.timelineEndMinute - day.timelineStartMinute) * PIXELS_PER_MINUTE
  const hourMarkers: number[] = []
  for (
    let minute = day.timelineStartMinute;
    minute <= day.timelineEndMinute;
    minute += 60
  )
    hourMarkers.push(minute)
  const hasOverlap = day.appointments.some(
    appointment => appointment.hasVisualOverlap,
  )

  if (!day.openings.length && !day.appointments.length)
    return (
      <EmptyState
        title="Institut fermé"
        description="Aucun horaire ni rendez-vous pour cette journée."
        className="mt-4"
        action={
          <Link
            href={`/admin/appointments/new?date=${day.dateKey}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            <Plus className="size-4" /> Ajouter manuellement
          </Link>
        }
      />
    )

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-300" /> Libre
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-dashed border-slate-400" />
          Prépa / rangement
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-amber-200" /> Fermeture
        </span>
      </div>

      {hasOverlap ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Deux rendez-vous se chevauchent visuellement. Vérifiez leurs horaires.
        </p>
      ) : null}

      {day.appointments.length ? (
        <section
          className="mt-3 rounded-2xl border bg-card p-3"
          aria-labelledby="daily-status-actions"
        >
          <h3 id="daily-status-actions" className="text-sm font-semibold">
            Actions rapides
          </h3>
          <ul className="mt-3 space-y-3">
            {day.appointments.map(appointment => (
              <li
                key={appointment.id}
                className="rounded-xl border bg-background p-3"
              >
                <Link
                  href={`/admin/appointments/${appointment.id}?date=${day.dateKey}`}
                  className="flex min-h-11 items-start justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {formatTimelineMinute(appointment.startMinute)} ·{' '}
                      {appointment.customerName}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {appointment.serviceLabel}
                    </span>
                  </span>
                  <StatusBadge
                    variant={statusVariants[appointment.status]}
                    className="shrink-0"
                  >
                    {statusLabels[appointment.status]}
                  </StatusBadge>
                </Link>
                <AppointmentStatusActions
                  appointmentId={appointment.id}
                  status={appointment.status}
                  startsAt={appointment.startsAt}
                  compact
                  className="mt-2"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="relative mt-3 overflow-hidden rounded-2xl border bg-muted/35">
        <div className="relative" style={{ height }}>
          {hourMarkers.map(minute => (
            <div
              key={minute}
              className="pointer-events-none absolute inset-x-0 border-t border-border/70"
              style={{
                top: (minute - day.timelineStartMinute) * PIXELS_PER_MINUTE,
              }}
            >
              <span className="absolute left-2 top-1 bg-muted/80 px-1 text-[10px] font-medium tabular-nums text-muted-foreground">
                {formatTimelineMinute(minute)}
              </span>
            </div>
          ))}

          {day.openings.map(opening => (
            <div
              key={`${opening.startMinute}-${opening.endMinute}`}
              className="pointer-events-none absolute left-12 right-0 border-y border-emerald-200/70 bg-emerald-50/70"
              style={positionStyle(opening, day.timelineStartMinute)}
            />
          ))}

          {freeStarts.map(minute => (
            <Link
              key={minute}
              href={`/admin/appointments/new?date=${day.dateKey}&time=${formatTimelineMinute(minute)}`}
              aria-label={`Ajouter un rendez-vous à ${formatTimelineMinute(minute)}`}
              className="group absolute left-12 right-1 z-10 flex items-center justify-end rounded-lg border border-dashed border-transparent px-2 text-[10px] font-medium text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100/90 focus:border-emerald-500 focus:bg-emerald-100 focus:outline-none"
              style={positionStyle(
                { startMinute: minute, endMinute: minute + 30 },
                day.timelineStartMinute,
              )}
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2 py-1 opacity-70 group-hover:opacity-100 group-focus:opacity-100">
                <Plus className="size-3" /> {formatTimelineMinute(minute)}
              </span>
            </Link>
          ))}

          {day.exceptions.map(exception => {
            const visibleException = {
              startMinute: Math.max(
                exception.startMinute,
                day.timelineStartMinute,
              ),
              endMinute: Math.min(exception.endMinute, day.timelineEndMinute),
            }
            if (visibleException.startMinute >= visibleException.endMinute)
              return null
            return (
              <div
                key={exception.id}
                className={`pointer-events-none absolute left-12 right-1 z-20 overflow-hidden rounded-lg border px-2 py-1 text-[10px] font-semibold ${
                  exception.type === 'UNAVAILABLE'
                    ? 'border-amber-300 bg-amber-100/90 text-amber-950'
                    : 'border-emerald-400 bg-emerald-50/40 text-emerald-950'
                }`}
                style={positionStyle(visibleException, day.timelineStartMinute)}
              >
                {exception.type === 'UNAVAILABLE' ? 'Fermé' : 'Ouverture'}{' '}
                {formatTimelineMinute(exception.startMinute)}–
                {formatTimelineMinute(exception.endMinute)}
                {exception.label ? ` · ${exception.label}` : ''}
              </div>
            )
          })}

          {day.appointments.map(appointment => {
            const occupiedStyle = positionStyle(
              {
                startMinute: appointment.occupiedStartMinute,
                endMinute: appointment.occupiedEndMinute,
              },
              day.timelineStartMinute,
            )
            const mainHeight = Math.max(
              32,
              (appointment.endMinute - appointment.startMinute) *
                PIXELS_PER_MINUTE,
            )
            return (
              <Link
                key={appointment.id}
                href={`/admin/appointments/${appointment.id}?date=${day.dateKey}`}
                aria-label={`${formatTimelineMinute(appointment.startMinute)}, ${appointment.customerName}, ${appointment.serviceLabel}, ${statusLabels[appointment.status]}`}
                className={`absolute left-12 right-1 z-30 overflow-visible rounded-xl border border-dashed bg-background/75 shadow-sm transition hover:shadow-md ${
                  appointment.hasVisualOverlap
                    ? 'border-destructive ring-2 ring-destructive/60'
                    : appointment.status === 'NO_SHOW'
                      ? 'border-destructive/60 bg-destructive/5 opacity-75'
                      : appointment.status === 'COMPLETED'
                        ? 'border-primary/40 bg-primary/5 opacity-75'
                        : 'border-muted-foreground/40'
                }`}
                style={occupiedStyle}
              >
                {appointment.preparationMinutes > 0 ? (
                  <span className="absolute inset-x-2 top-0 truncate text-[9px] leading-4 text-muted-foreground">
                    Prépa {appointment.preparationMinutes} min
                  </span>
                ) : null}
                <span
                  className="absolute inset-x-0 overflow-hidden rounded-lg border-l-4 bg-background px-2 py-1.5"
                  style={{
                    top:
                      (appointment.startMinute -
                        appointment.occupiedStartMinute) *
                      PIXELS_PER_MINUTE,
                    minHeight: mainHeight,
                    borderLeftColor: appointment.serviceColor,
                  }}
                >
                  <span className="flex items-center justify-between gap-2 text-[11px] font-bold tabular-nums">
                    {formatTimelineMinute(appointment.startMinute)}–
                    {formatTimelineMinute(appointment.endMinute)}
                    {appointment.source === 'ADMIN' ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-medium uppercase text-muted-foreground">
                        manuel
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs font-semibold">
                    {appointment.customerName}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {appointment.serviceLabel}
                  </span>
                  <span className="mt-0.5 block text-[9px] font-semibold">
                    {statusLabels[appointment.status]}
                  </span>
                </span>
                {appointment.cleanupMinutes > 0 ? (
                  <span className="absolute inset-x-2 bottom-0 truncate text-right text-[9px] leading-4 text-muted-foreground">
                    Rangement {appointment.cleanupMinutes} min
                  </span>
                ) : null}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
