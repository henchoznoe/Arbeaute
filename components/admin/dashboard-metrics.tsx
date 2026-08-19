import { Banknote, CalendarCheck2, Gauge, UserX } from 'lucide-react'
import type { DashboardMetrics as DashboardMetricsValues } from '@/lib/admin/dashboard-metrics'
import { formatCount, formatPrice } from '@/lib/utils/format'

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
  // Quatre cartes exactement : la grille mobile tient sur deux colonnes sans
  // qu'une dernière carte double de largeur ne casse le rythme. Les heures
  // réservées, cinquième carte auparavant, sont devenues la légende de
  // l'occupation, dont elles sont le numérateur.
  const cards = [
    {
      // Les trois autres cartes couvrent la semaine ; celle-ci couvre le jour
      // ouvert dans l'agenda. La date seule ne le disait pas : on lisait un
      // nombre hebdomadaire suivi d'une date inexpliquée.
      label: 'Rendez-vous du jour',
      value: formatCount(metrics.selectedDayCount),
      scope: `Le ${selectedDayLabel}, le jour ouvert dans l’agenda`,
      icon: CalendarCheck2,
    },
    {
      label: 'Recette attendue',
      value: formatPrice(metrics.plannedRevenueCents),
      scope:
        'Rendez-vous confirmés et terminés, au prix du jour de la réservation',
      icon: Banknote,
    },
    {
      label: 'Temps rempli',
      value:
        metrics.occupancyRate === null
          ? 'Institut fermé'
          : `${metrics.occupancyRate} %`,
      scope: `${formatDuration(metrics.bookedMinutes)} de soins sur vos heures d’ouverture`,
      icon: Gauge,
    },
    {
      // Le même mot que le bilan du dimanche (« Absences notées ») et que le
      // bouton de l'agenda (« Absence ») : une seule façon de nommer la chose.
      label: 'Absences notées',
      value: formatCount(metrics.noShowCount),
      scope: 'Comptées à part, elles n’entrent pas dans la recette attendue',
      icon: UserX,
    },
  ]

  return (
    <section className="mt-5" aria-labelledby="dashboard-metrics-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="dashboard-metrics-title" className="font-semibold">
          Votre semaine en chiffres
        </h2>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <article
              key={card.label}
              className="min-w-0 rounded-2xl border bg-card p-3 shadow-sm sm:p-4"
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
