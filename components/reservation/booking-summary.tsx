import { CalendarDays, Clock } from 'lucide-react'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import { formatAppointmentDate } from '@/lib/reservation/time'
import { cn } from '@/lib/utils/cn'

interface SummaryService {
  name: string
  categoryName: string
  durationMinutes: number
  priceCents: number
  priceNote: string | null
}

const formatPrice = (priceCents: number, priceNote: string | null): string =>
  `${(priceCents / 100).toLocaleString('fr-CH')} CHF${
    priceNote === '/ min' ? ' / min' : ''
  }`

export const BookingSummary = ({
  service,
  startsAt,
  sticky = false,
  className,
}: Readonly<{
  service: SummaryService
  startsAt: string
  sticky?: boolean
  className?: string
}>) => (
  <aside
    aria-label="Récapitulatif de la réservation"
    className={cn(
      'rounded-2xl border border-primary/20 bg-background/95 p-4 shadow-sm backdrop-blur',
      sticky && 'sticky top-16 z-20',
      className,
    )}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">
          Votre réservation
        </p>
        <p className="mt-1 truncate text-sm font-semibold sm:text-base">
          {formatServiceLabel(service.name, service.categoryName)}
        </p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-[#806b4d]">
        {formatPrice(service.priceCents, service.priceNote)}
      </p>
    </div>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
      <span className="flex items-center gap-1.5">
        <Clock className="size-3.5" /> {service.durationMinutes} min
      </span>
      <span className="flex items-center gap-1.5 capitalize">
        <CalendarDays className="size-3.5" />
        {startsAt
          ? formatAppointmentDate(new Date(startsAt))
          : 'Créneau à choisir'}
      </span>
    </div>
  </aside>
)
