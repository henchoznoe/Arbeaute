import type { LucideIcon } from 'lucide-react'
import {
  CalendarClock,
  CalendarPlus,
  CircleHelp,
  Clock,
  Search,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { Button } from '@/components/ui/button'
import { getAdminSession } from '@/lib/core/session-cookies'

interface HelpGuide {
  action: string
  href: string
  icon: LucideIcon
  note?: string
  steps: string[]
  title: string
}

const guides: HelpGuide[] = [
  {
    title: 'Ajouter un rendez-vous',
    icon: CalendarPlus,
    steps: [
      'Dans l’agenda, choisissez le jour puis appuyez sur « Ajouter ». Sur ordinateur, vous pouvez aussi cliquer directement sur une heure libre.',
      'Choisissez le soin, la date et l’heure.',
      'Recherchez un client déjà connu ou remplissez ses coordonnées, puis appuyez sur « Créer le rendez-vous ».',
    ],
    href: '/admin/appointments/new',
    action: 'Ajouter un rendez-vous',
  },
  {
    title: 'Déplacer un rendez-vous',
    icon: CalendarClock,
    steps: [
      'Ouvrez le rendez-vous depuis l’agenda ou la recherche.',
      'Changez la date ou l’heure de début.',
      'Appuyez sur « Enregistrer les modifications ». Un e-mail est envoyé automatiquement si une adresse est enregistrée.',
    ],
    href: '/admin/search',
    action: 'Rechercher un rendez-vous',
  },
  {
    title: 'Annuler un rendez-vous',
    icon: XCircle,
    steps: [
      'Ouvrez le rendez-vous depuis l’agenda ou la recherche.',
      'Descendez jusqu’à « Annuler le rendez-vous », puis confirmez.',
      'L’heure redevient libre et la personne peut être prévenue par e-mail.',
    ],
    note: 'Un rendez-vous ne se supprime pas définitivement : il est annulé afin de garder l’historique et peut être rétabli si l’heure est encore libre.',
    href: '/admin/search',
    action: 'Rechercher un rendez-vous',
  },
  {
    title: 'Retrouver un client ou un rendez-vous',
    icon: Search,
    steps: [
      'Ouvrez « Recherche » dans la navigation.',
      'Choisissez l’onglet voulu, puis saisissez un nom, une adresse e-mail ou un numéro de téléphone.',
      'Ouvrez le résultat pour voir le client ou modifier le rendez-vous.',
    ],
    href: '/admin/search',
    action: 'Ouvrir la recherche',
  },
  {
    title: 'Répondre à une demande de dernière minute',
    icon: Clock,
    steps: [
      'Lorsqu’une demande attend, ouvrez « Demandes » depuis l’alerte de l’agenda ou la navigation.',
      'Vérifiez l’heure, le soin et les coordonnées.',
      'Acceptez pour créer le rendez-vous, ou refusez pour prévenir la personne que cette heure n’est pas disponible.',
    ],
    href: '/admin/demandes',
    action: 'Voir les demandes',
  },
]

const HelpPage = () => (
  <Suspense fallback={<AdminSkeleton variant="cards" />}>
    <Help />
  </Suspense>
)

const Help = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')

  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin"
        backLabel="Agenda"
        eyebrow="Arbeauté"
        title="Aide rapide"
        icon={CircleHelp}
        description="Les gestes du quotidien, expliqués étape par étape."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {guides.map(guide => {
          const Icon = guide.icon
          return (
            <article
              key={guide.title}
              className="flex min-w-0 flex-col rounded-3xl border bg-card p-5 shadow-sm sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h2 className="pt-2 text-lg font-semibold">{guide.title}</h2>
              </div>
              <ol className="mt-5 space-y-3 text-sm leading-relaxed">
                {guide.steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              {guide.note ? (
                <p className="mt-4 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                  {guide.note}
                </p>
              ) : null}
              <Button
                asChild
                variant="outline"
                className="mt-5 w-full sm:w-auto sm:self-start"
              >
                <Link href={guide.href}>{guide.action}</Link>
              </Button>
            </article>
          )
        })}
      </div>
    </AdminPage>
  )
}

export default HelpPage
