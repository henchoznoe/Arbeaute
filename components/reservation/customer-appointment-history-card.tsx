import {
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  CircleSlash2,
  Repeat2,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  type CustomerAppointmentState,
  customerAppointmentStateLabels,
} from '@/lib/reservation/customer-appointments'
import { cn } from '@/lib/utils/cn'
import { capitalizeFirst } from '@/lib/utils/format'

interface CustomerAppointmentHistoryCardProps {
  bookingPath: string | null
  dateLabel: string
  priceLabel: string
  serviceLabel: string
  state: Exclude<CustomerAppointmentState, 'UPCOMING'>
}

const statePresentation = {
  IN_PROGRESS: {
    icon: CalendarClock,
    className: 'border-primary/25 bg-primary/10 text-primary',
  },
  PAST: {
    icon: CalendarClock,
    className: 'border-border bg-muted text-muted-foreground',
  },
  CANCELLED: {
    icon: CalendarX2,
    className: 'border-brand-line bg-brand-subtle text-brand-strong',
  },
  COMPLETED: {
    icon: CalendarCheck2,
    className: 'border-success-line bg-success-subtle text-success-strong',
  },
  NO_SHOW: {
    icon: CircleSlash2,
    className: 'border-warning-line bg-warning-subtle text-warning-strong',
  },
} satisfies Record<
  Exclude<CustomerAppointmentState, 'UPCOMING'>,
  { icon: typeof CalendarClock; className: string }
>

export const CustomerAppointmentHistoryCard = ({
  bookingPath,
  dateLabel,
  priceLabel,
  serviceLabel,
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
          <h3 className="mt-3 font-heading text-xl font-bold">
            {serviceLabel}
          </h3>
          <p className="mt-2 text-sm">{capitalizeFirst(dateLabel)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{priceLabel}</p>
        </div>
        {bookingPath ? (
          <Button asChild variant="secondary" className="shrink-0">
            <Link href={bookingPath}>
              <Repeat2 className="size-4" /> Réserver à nouveau
            </Link>
          </Button>
        ) : (
          <p className="max-w-48 text-sm text-muted-foreground">
            Cette prestation n’est plus disponible à la réservation.
          </p>
        )}
      </div>
    </article>
  )
}
