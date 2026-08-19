import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  Clock3,
  Database,
  Mail,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { getAdminSession } from '@/lib/core/session-cookies'

const SettingsPage = () => (
  <Suspense fallback={<AdminSkeleton variant="cards" />}>
    <Settings />
  </Suspense>
)

const cards: Array<{
  href: string
  icon: LucideIcon
  title: string
  description: string
  action: string
}> = [
  {
    href: '/admin/settings/booking',
    icon: SlidersHorizontal,
    title: 'Réservation',
    description:
      'Combien de temps à l’avance réserver, jusqu’à quand, les demandes de dernière minute, et jusqu’à quand un rendez-vous peut être changé sans vous.',
    action: 'Gérer les règles',
  },
  {
    href: '/admin/settings/agenda',
    icon: CalendarDays,
    title: 'Agenda',
    description:
      'Les jours que la vue semaine affiche sur ordinateur. Le choix est enregistré ici, pas dans votre navigateur.',
    action: 'Choisir les jours',
  },
  {
    href: '/admin/availability',
    icon: Clock3,
    title: 'Horaires',
    description:
      'Vos heures d’ouverture de la semaine, vos vacances et vos ouvertures exceptionnelles.',
    action: 'Gérer les horaires',
  },
  {
    href: '/admin/emails',
    icon: Mail,
    title: 'E-mails',
    description:
      'Les messages envoyés depuis le site, ceux qui ne sont pas partis, et ce qu’il vous reste sur l’offre gratuite.',
    action: 'Voir les e-mails',
  },
  {
    href: '/admin/data',
    icon: Database,
    title: 'Données',
    description:
      'Télécharger vos données, effacer les coordonnées d’une personne qui le demande, et vérifier vos sauvegardes.',
    action: 'Gérer les données',
  },
  {
    href: '/admin/services',
    icon: Settings2,
    title: 'Prestations',
    description:
      'Vos soins, leurs prix, leurs durées et l’ordre dans lequel ils apparaissent sur le site.',
    action: 'Gérer les prestations',
  },
]

const Settings = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Arbeauté"
        title="Réglages"
        description="Gérez les disponibilités de l’institut et les prestations proposées sur le site."
      />

      {/* Six entrées, trois par ligne : sur deux colonnes, les deux dernières
          tombaient sous la ligne de flottaison sans raison. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col rounded-3xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-6" />
              </span>
              <h2 className="mt-5 text-xl font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {card.description}
              </p>
              <span className="mt-auto inline-flex min-h-11 items-center pt-4 text-sm font-medium text-primary">
                {card.action} →
              </span>
            </Link>
          )
        })}
      </div>
    </AdminPage>
  )
}

export default SettingsPage
