'use client'

import { CalendarClock, ChevronRight, Clock3 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatAppointmentCountdown } from '@/lib/admin/next-appointment'

interface NextAppointmentCardProps {
  /** Instant de départ en ISO : le compte à rebours est calculé côté client. */
  startsAt: string
  dateKey: string
  id: string
  customerName: string
  serviceLabel: string
  timeLabel: string
  /** Libellé du jour, affiché quand le rendez-vous n'est pas aujourd'hui. */
  dayLabel: string
  isToday: boolean
}

export const NextAppointmentCard = ({
  startsAt,
  dateKey,
  id,
  customerName,
  serviceLabel,
  timeLabel,
  dayLabel,
  isToday,
}: Readonly<NextAppointmentCardProps>) => {
  // Rendu vide au premier passage : le serveur ne connaît pas l'heure du
  // navigateur, et un délai calculé au rendu serait faux dès l'hydratation.
  const [countdown, setCountdown] = useState<string | null>(null)

  useEffect(() => {
    const start = new Date(startsAt)
    const refresh = () =>
      setCountdown(formatAppointmentCountdown(start, new Date()))
    refresh()
    const timer = window.setInterval(refresh, 30_000)
    return () => window.clearInterval(timer)
  }, [startsAt])

  return (
    <Link
      href={`/admin/appointments/${id}?date=${dateKey}`}
      aria-labelledby="next-appointment-title"
      className="mt-4 block rounded-2xl border border-primary/25 bg-primary/5 p-4 transition hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <h2
        id="next-appointment-title"
        className="flex items-center gap-2 text-2xs font-semibold tracking-wide text-primary uppercase"
      >
        <CalendarClock className="size-4 shrink-0" />
        Prochain rendez-vous
      </h2>

      {/* Le délai restant est posé à côté de l'heure, dont il découle : sur la
          ligne du titre, il forçait « Prochain rendez-vous » à se couper. */}
      {/* Pas de `capitalizeFirst` ici : la date suit l'heure sur la même
          ligne, elle ne commence donc rien. */}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-heading text-2xl font-bold tabular-nums">
          {timeLabel}
          {isToday ? null : (
            <span className="ml-2 text-base font-medium">{dayLabel}</span>
          )}
        </p>
        {countdown ? (
          <StatusBadge variant="info" className="shrink-0">
            <Clock3 className="size-3" />
            {countdown}
          </StatusBadge>
        ) : null}
      </div>
      {/* Toute la carte est le lien : un bouton séparé coûtait soixante pixels
          et repoussait la journée en cours hors de l'écran. */}
      <div className="mt-1 flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="block font-semibold">{customerName}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {serviceLabel}
          </span>
        </span>
        <ChevronRight
          className="size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
      </div>
    </Link>
  )
}
