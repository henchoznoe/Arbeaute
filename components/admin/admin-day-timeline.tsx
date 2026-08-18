'use client'

import { AlertTriangle, ChevronDown, Plus, UserRound } from 'lucide-react'
import Link from 'next/link'
import { AppointmentStatusActions } from '@/components/admin/appointment-status-actions'
import { CustomerCallButton } from '@/components/admin/customer-call-button'
import { Button } from '@/components/ui/button'
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
          <Button asChild>
            <Link href={`/admin/appointments/new?date=${day.dateKey}`}>
              <Plus className="size-4" /> Ajouter manuellement
            </Link>
          </Button>
        }
      />
    )

  return (
    <div className="mt-4">
      {hasOverlap ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Deux rendez-vous se superposent. Ouvrez l’un des deux pour corriger
          son heure.
        </p>
      ) : null}

      {day.appointments.length ? (
        <section aria-labelledby="daily-appointments-title">
          <h3 id="daily-appointments-title" className="sr-only">
            Rendez-vous du {day.label}
          </h3>
          <ul className="space-y-3">
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
                {/* Appeler et ouvrir la fiche côte à côte : les deux gestes
                    qu'Arzu fait en regardant un nom. Un rendez-vous ancien sans
                    fiche rattachée n'affiche pas de lien mort. */}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <CustomerCallButton
                    phone={appointment.customerPhone}
                    customerName={appointment.customerName}
                    className="w-full"
                  />
                  {appointment.customerId ? (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/admin/customers/${appointment.customerId}`}>
                        <UserRound className="size-4" /> Voir la fiche
                      </Link>
                    </Button>
                  ) : null}
                </div>
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
      ) : (
        <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Aucun rendez-vous ce jour-là.
        </p>
      )}

      {/* Vue détaillée repliée : le quotidien d'Arzu est la liste ci-dessus,
          la chronologie au pixel sert à caler un créneau, pas à consulter. */}
      <details className="group mt-4 rounded-2xl border bg-card">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-4 text-sm font-medium">
          Voir l’horaire détaillé et les heures libres
          <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" />
        </summary>

        <div className="border-t px-3 pt-3 pb-3">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-2xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-success-accent" /> Heure
              libre
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm border border-dashed border-muted-foreground" />
              Installation et rangement
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-warning-line" /> Institut
              fermé
            </span>
          </div>

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
                  <span className="absolute left-2 top-1 bg-muted/80 px-1 text-2xs font-medium tabular-nums text-muted-foreground">
                    {formatTimelineMinute(minute)}
                  </span>
                </div>
              ))}

              {day.openings.map(opening => (
                <div
                  key={`${opening.startMinute}-${opening.endMinute}`}
                  className="pointer-events-none absolute left-12 right-0 border-y border-success-line/70 bg-success-subtle/70"
                  style={positionStyle(opening, day.timelineStartMinute)}
                />
              ))}

              {freeStarts.map(minute => (
                <Link
                  key={minute}
                  href={`/admin/appointments/new?date=${day.dateKey}&time=${formatTimelineMinute(minute)}`}
                  aria-label={`Ajouter un rendez-vous à ${formatTimelineMinute(minute)}`}
                  className="group absolute left-12 right-1 z-10 flex items-center justify-end rounded-lg border border-dashed border-transparent px-2 text-2xs font-medium text-success-strong transition hover:border-success-accent hover:bg-success-soft/90 focus:border-success focus:bg-success-soft focus:outline-none"
                  style={positionStyle(
                    { startMinute: minute, endMinute: minute + 30 },
                    day.timelineStartMinute,
                  )}
                >
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft/80 px-2 py-1 opacity-70 group-hover:opacity-100 group-focus:opacity-100">
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
                  endMinute: Math.min(
                    exception.endMinute,
                    day.timelineEndMinute,
                  ),
                }
                if (visibleException.startMinute >= visibleException.endMinute)
                  return null
                return (
                  <div
                    key={exception.id}
                    className={`pointer-events-none absolute left-12 right-1 z-20 overflow-hidden rounded-lg border px-2 py-1 text-2xs font-semibold ${
                      exception.type === 'UNAVAILABLE'
                        ? 'border-warning-accent bg-warning-soft/90 text-warning-strong'
                        : 'border-success-accent bg-success-subtle/40 text-success-strong'
                    }`}
                    style={positionStyle(
                      visibleException,
                      day.timelineStartMinute,
                    )}
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
                      <span className="absolute inset-x-2 top-0 truncate text-2xs leading-4 text-muted-foreground">
                        Installation {appointment.preparationMinutes} min
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
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-2xs font-medium uppercase text-muted-foreground">
                            manuel
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs font-semibold">
                        {appointment.customerName}
                      </span>
                      <span className="block truncate text-2xs text-muted-foreground">
                        {appointment.serviceLabel}
                      </span>
                      <span className="mt-0.5 block text-2xs font-semibold">
                        {statusLabels[appointment.status]}
                      </span>
                    </span>
                    {appointment.cleanupMinutes > 0 ? (
                      <span className="absolute inset-x-2 bottom-0 truncate text-right text-2xs leading-4 text-muted-foreground">
                        Rangement {appointment.cleanupMinutes} min
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}
