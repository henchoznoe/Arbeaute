'use client'

import { CalendarClock, Clock3 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
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
    <section
      aria-labelledby="next-appointment-title"
      className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="next-appointment-title"
          className="flex items-center gap-2 text-2xs font-semibold tracking-wide text-primary uppercase"
        >
          <CalendarClock className="size-4" />
          Prochain rendez-vous
        </h2>
        {countdown ? (
          <StatusBadge variant="info" className="shrink-0">
            <Clock3 className="size-3" />
            {countdown}
          </StatusBadge>
        ) : null}
      </div>

      {/* Pas de `capitalize` : appliqué à une date entière il produirait
          « Lundi 17 Août », que le français n'écrit pas ainsi. */}
      <p className="mt-3 font-heading text-2xl font-bold tabular-nums">
        {timeLabel}
        {isToday ? null : (
          <span className="ml-2 text-base font-medium">{dayLabel}</span>
        )}
      </p>
      <p className="mt-1 font-semibold">{customerName}</p>
      <p className="truncate text-sm text-muted-foreground">{serviceLabel}</p>

      <Button asChild variant="outline" className="mt-3 w-full bg-background">
        <Link href={`/admin/appointments/${id}?date=${dateKey}`}>
          Voir le rendez-vous
        </Link>
      </Button>
    </section>
  )
}
