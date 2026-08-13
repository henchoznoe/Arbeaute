import {
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  CircleSlash2,
  Repeat2,
} from 'lucide-react'
import Link from 'next/link'
import {
  type CustomerAppointmentState,
  customerAppointmentStateLabels,
} from '@/lib/reservation/customer-appointments'
import { cn } from '@/lib/utils/cn'

interface CustomerAppointmentHistoryCardProps {
  bookingPath: string | null
  dateLabel: string
  priceLabel: string
  serviceName: string
  state: Exclude<CustomerAppointmentState, 'UPCOMING'>
}

const statePresentation = {
  IN_PROGRESS: {
    icon: CalendarClock,
    className: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  PAST: {
    icon: CalendarClock,
    className: 'border-border bg-muted text-muted-foreground',
  },
  CANCELLED: {
    icon: CalendarX2,
    className: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  COMPLETED: {
    icon: CalendarCheck2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  NO_SHOW: {
    icon: CircleSlash2,
    className: 'border-amber-200 bg-amber-50 text-amber-900',
  },
} satisfies Record<
  Exclude<CustomerAppointmentState, 'UPCOMING'>,
  { icon: typeof CalendarClock; className: string }
>

export const CustomerAppointmentHistoryCard = ({
  bookingPath,
  dateLabel,
  priceLabel,
  serviceName,
  state,
}: Readonly<CustomerAppointmentHistoryCardProps>) => {
  const presentation = statePresentation[state]
  const StateIcon = presentation.icon

  return (
    <article className="rounded-2xl border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            className={cn(
              'inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold',
              presentation.className,
            )}
          >
            <StateIcon className="size-4" />
            {customerAppointmentStateLabels[state]}
          </p>
          <h3 className="mt-3 font-heading text-xl font-bold">{serviceName}</h3>
          <p className="mt-2 text-sm capitalize">{dateLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">{priceLabel}</p>
        </div>
        {bookingPath ? (
          <Link
            href={bookingPath}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 text-sm font-medium text-primary"
          >
            <Repeat2 className="size-4" /> Réserver à nouveau
          </Link>
        ) : (
          <p className="max-w-48 text-sm text-muted-foreground">
            Cette prestation n’est plus disponible à la réservation.
          </p>
        )}
      </div>
    </article>
  )
}
