import { Plus } from 'lucide-react'
import Link from 'next/link'
import {
  type AdminTimelineDay,
  assignTimelineLanes,
  formatTimelineMinute,
  getFreeTimelineStarts,
  getWeekTimelineBounds,
} from '@/lib/admin/agenda-timeline'
import { capitalizeFirst } from '@/lib/utils/format'

/**
 * La semaine sur ordinateur, à l'échelle des heures.
 *
 * La version précédente empilait des cartes dans sept colonnes : un rendez-vous
 * d'un quart d'heure occupait autant de place qu'un soin de deux heures, la
 * journée ne se lisait pas d'un coup d'œil, et chaque carte portait un bouton
 * « Absence » — une action qui survient une fois par mois à la place d'une
 * information consultée tous les jours. Ici, un rendez-vous occupe sa durée
 * réelle, les trous se voient, et noter une absence se fait depuis le détail du
 * rendez-vous ou depuis la liste du jour sur téléphone.
 */

const PIXELS_PER_MINUTE = 1.1
const HOUR_GUTTER = 'w-12'

const statusLabels = {
  CONFIRMED: 'Confirmé',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  NO_SHOW: 'Absence',
} as const

const appointmentTone = (
  status: keyof typeof statusLabels,
  hasVisualOverlap: boolean,
): string => {
  if (hasVisualOverlap) return 'border-destructive ring-2 ring-destructive/50'
  if (status === 'NO_SHOW') return 'border-destructive/50 opacity-70'
  if (status === 'COMPLETED') return 'border-primary/40 opacity-75'
  if (status === 'CANCELLED') return 'border-muted-foreground/30 opacity-60'
  return 'border-border'
}

export const AdminWeekGrid = ({
  days,
  visibleIndexes,
}: Readonly<{ days: AdminTimelineDay[]; visibleIndexes: number[] }>) => {
  const visibleDays = visibleIndexes.flatMap(index => {
    const day = days[index]
    return day ? [day] : []
  })
  const bounds = getWeekTimelineBounds(visibleDays)
  const height = (bounds.endMinute - bounds.startMinute) * PIXELS_PER_MINUTE
  const hourMarkers: number[] = []
  for (
    let minute = Math.ceil(bounds.startMinute / 60) * 60;
    minute <= bounds.endMinute;
    minute += 60
  )
    hourMarkers.push(minute)

  const offset = (minute: number) =>
    (minute - bounds.startMinute) * PIXELS_PER_MINUTE

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border bg-card">
      <div className="flex">
        <div className={`${HOUR_GUTTER} shrink-0 border-r`}>
          {/* Colonne vide en tête, à la hauteur des en-têtes de jour. */}
          <div className="h-11 border-b" />
          <div className="relative" style={{ height }}>
            {hourMarkers.map(minute => (
              <span
                key={minute}
                className="absolute right-1 -translate-y-1/2 text-2xs font-medium tabular-nums text-muted-foreground"
                style={{ top: offset(minute) }}
              >
                {formatTimelineMinute(minute)}
              </span>
            ))}
          </div>
        </div>

        <div
          className="grid min-w-0 flex-1"
          style={{
            gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleDays.map(day => {
            const lanes = assignTimelineLanes(
              day.appointments.map(appointment => ({
                startMinute: appointment.occupiedStartMinute,
                endMinute: appointment.occupiedEndMinute,
              })),
            )
            return (
              <section
                key={day.dateKey}
                className={`min-w-0 border-r last:border-r-0 ${day.isToday ? 'bg-primary/5' : ''}`}
                aria-label={day.label}
              >
                <div className="flex h-11 items-center justify-between gap-1 border-b px-2">
                  <h3 className="truncate text-sm font-semibold">
                    {capitalizeFirst(day.label.replace(/\s\d{4}$/, ''))}
                  </h3>
                  <Link
                    href={`/admin/appointments/new?date=${day.dateKey}`}
                    aria-label={`Ajouter un rendez-vous le ${day.label}`}
                    className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="size-4" />
                  </Link>
                </div>

                <div className="relative" style={{ height }}>
                  {hourMarkers.map(minute => (
                    <div
                      key={minute}
                      className="pointer-events-none absolute inset-x-0 border-t border-border/60"
                      style={{ top: offset(minute) }}
                    />
                  ))}

                  {day.openings.map(opening => (
                    <div
                      key={`${opening.startMinute}-${opening.endMinute}`}
                      className="pointer-events-none absolute inset-x-0 bg-success-subtle/50"
                      style={{
                        top: offset(opening.startMinute),
                        height:
                          (opening.endMinute - opening.startMinute) *
                          PIXELS_PER_MINUTE,
                      }}
                    />
                  ))}

                  {/* Un clic sur un blanc préremplit la bonne heure : c'est le
                      geste le plus fréquent, il ne doit pas passer par un
                      formulaire vide. */}
                  {getFreeTimelineStarts(day).map(minute => (
                    <Link
                      key={minute}
                      href={`/admin/appointments/new?date=${day.dateKey}&time=${formatTimelineMinute(minute)}`}
                      aria-label={`Ajouter un rendez-vous le ${day.label} à ${formatTimelineMinute(minute)}`}
                      className="group absolute inset-x-0.5 z-10 flex items-center justify-center rounded-md border border-dashed border-transparent text-2xs font-medium text-success-strong transition hover:border-success-accent hover:bg-success-soft/80 focus:border-success focus:bg-success-soft focus:outline-none"
                      style={{
                        top: offset(minute),
                        height: 30 * PIXELS_PER_MINUTE,
                      }}
                    >
                      <span className="inline-flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">
                        <Plus className="size-3" />
                        {formatTimelineMinute(minute)}
                      </span>
                    </Link>
                  ))}

                  {day.exceptions.map(exception => {
                    const top = Math.max(
                      exception.startMinute,
                      bounds.startMinute,
                    )
                    const bottom = Math.min(
                      exception.endMinute,
                      bounds.endMinute,
                    )
                    if (top >= bottom) return null
                    return (
                      <div
                        key={exception.id}
                        className={`pointer-events-none absolute inset-x-0 z-20 overflow-hidden px-1.5 py-0.5 text-2xs font-semibold ${
                          exception.type === 'UNAVAILABLE'
                            ? 'bg-warning-soft/85 text-warning-strong'
                            : 'bg-success-subtle/60 text-success-strong'
                        }`}
                        style={{
                          top: offset(top),
                          height: (bottom - top) * PIXELS_PER_MINUTE,
                        }}
                      >
                        {exception.type === 'UNAVAILABLE' ? 'Fermé' : 'Ouvert'}
                        {exception.label ? ` · ${exception.label}` : ''}
                      </div>
                    )
                  })}

                  {day.appointments.map((appointment, index) => {
                    const lane = lanes[index] ?? { lane: 0, laneCount: 1 }
                    const width = 100 / lane.laneCount
                    return (
                      <Link
                        key={appointment.id}
                        href={`/admin/appointments/${appointment.id}?date=${day.dateKey}`}
                        aria-label={`${formatTimelineMinute(appointment.startMinute)}, ${appointment.customerName}, ${appointment.serviceLabel}, ${statusLabels[appointment.status]}`}
                        className={`absolute z-30 overflow-hidden rounded-lg border bg-background px-1.5 py-1 shadow-sm transition hover:z-40 hover:shadow-md ${appointmentTone(appointment.status, appointment.hasVisualOverlap)}`}
                        style={{
                          top: offset(appointment.occupiedStartMinute),
                          height: Math.max(
                            26,
                            (appointment.occupiedEndMinute -
                              appointment.occupiedStartMinute) *
                              PIXELS_PER_MINUTE,
                          ),
                          left: `calc(${lane.lane * width}% + 2px)`,
                          width: `calc(${width}% - 4px)`,
                          borderLeftColor: appointment.serviceColor,
                          borderLeftWidth: 3,
                        }}
                      >
                        <span className="block text-2xs font-bold tabular-nums">
                          {formatTimelineMinute(appointment.startMinute)}
                        </span>
                        <span className="block truncate text-2xs font-semibold">
                          {appointment.customerName}
                        </span>
                        <span className="block truncate text-2xs text-muted-foreground">
                          {appointment.serviceLabel}
                        </span>
                        {appointment.status === 'CONFIRMED' ? null : (
                          <span className="block truncate text-2xs font-semibold text-muted-foreground">
                            {statusLabels[appointment.status]}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
