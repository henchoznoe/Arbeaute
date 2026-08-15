import { Banknote, CalendarCheck2, Clock3, Gauge, UserX } from 'lucide-react'
import type { DashboardMetrics as DashboardMetricsValues } from '@/lib/admin/dashboard-metrics'

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining
    ? `${hours} h ${remaining.toString().padStart(2, '0')}`
    : `${hours} h`
}

export const DashboardMetrics = ({
  metrics,
  periodLabel,
  selectedDayLabel,
}: Readonly<{
  metrics: DashboardMetricsValues
  periodLabel: string
  selectedDayLabel: string
}>) => {
  const cards = [
    {
      label: 'Rendez-vous',
      value: metrics.selectedDayCount.toLocaleString('fr-CH'),
      scope: selectedDayLabel,
      icon: CalendarCheck2,
    },
    {
      label: 'Heures réservées',
      value: formatDuration(metrics.bookedMinutes),
      scope: 'Durée des prestations, absences incluses',
      icon: Clock3,
    },
    {
      label: 'Chiffre prévu',
      value: `${(metrics.plannedRevenueCents / 100).toLocaleString('fr-CH')} CHF`,
      scope: 'Confirmés et terminés, prix figés',
      icon: Banknote,
    },
    {
      label: 'Occupation',
      value:
        metrics.occupancyRate === null
          ? 'Non calculable'
          : `${metrics.occupancyRate} %`,
      scope: 'Temps occupé / plages ouvertes',
      icon: Gauge,
    },
    {
      label: 'Absences',
      value: metrics.noShowCount.toLocaleString('fr-CH'),
      scope: 'Identifiées séparément du chiffre prévu',
      icon: UserX,
    },
  ]

  return (
    <section className="mt-5" aria-labelledby="dashboard-metrics-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="dashboard-metrics-title" className="font-semibold">
          Indicateurs de la semaine
        </h2>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <article
              key={card.label}
              className="min-w-0 rounded-2xl border bg-card p-3 shadow-sm last:col-span-2 sm:p-4 lg:last:col-span-1"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <h3 className="truncate text-xs font-medium">{card.label}</h3>
              </div>
              <p className="mt-2 truncate text-xl font-bold tabular-nums">
                {card.value}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {card.scope}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
