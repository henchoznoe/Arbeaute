import { CalendarHeart, HeartHandshake, MapPinned } from 'lucide-react'

const highlights = [
  {
    Icon: HeartHandshake,
    title: 'Un accueil personnel',
    description: 'Une seule praticienne, du conseil jusqu’à votre soin.',
  },
  {
    Icon: CalendarHeart,
    title: 'Du temps pour vous',
    description: 'Chaque visite est organisée sur rendez-vous, sans attente.',
  },
  {
    Icon: MapPinned,
    title: 'Au cœur de Bulle',
    description: 'Un institut indépendant à deux pas de la place du marché.',
  },
] as const

export const TrustHighlights = () => (
  <section aria-label="Les engagements Arbeauté" className="px-5 py-8 sm:px-8">
    <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-3">
      {highlights.map(({ Icon, title, description }) => (
        <article
          key={title}
          className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
            <Icon className="size-5" />
          </span>
          <div>
            <h2 className="font-heading text-base font-bold">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </article>
      ))}
    </div>
  </section>
)
