import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  ChevronRight,
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

interface SettingEntry {
  href: string
  icon: LucideIcon
  title: string
  description: string
}

const groups: Array<{ id: string; title: string; entries: SettingEntry[] }> = [
  {
    id: 'institut',
    title: 'Institut',
    entries: [
      {
        href: '/admin/availability',
        icon: Clock3,
        title: 'Horaires',
        description: 'Semaine habituelle, fermetures et vacances.',
      },
      {
        href: '/admin/services',
        icon: Settings2,
        title: 'Prestations',
        description: 'Soins, prix, durées et ordre sur le site.',
      },
    ],
  },
  {
    id: 'reservations',
    title: 'Réservations et messages',
    entries: [
      {
        href: '/admin/settings/booking',
        icon: SlidersHorizontal,
        title: 'Règles de réservation',
        description: 'Délais, créneaux et demandes de dernière minute.',
      },
      {
        href: '/admin/emails',
        icon: Mail,
        title: 'E-mails',
        description: 'Messages envoyés, échecs et limite gratuite.',
      },
    ],
  },
  {
    id: 'administration',
    title: 'Administration',
    entries: [
      {
        href: '/admin/settings/agenda',
        icon: CalendarDays,
        title: 'Affichage de l’agenda',
        description: 'Jours visibles dans la semaine sur ordinateur.',
      },
      {
        href: '/admin/data',
        icon: Database,
        title: 'Données',
        description: 'Téléchargements, sauvegardes et anonymisation.',
      },
    ],
  },
]

const SettingsPage = () => (
  <Suspense fallback={<AdminSkeleton variant="list" />}>
    <Settings />
  </Suspense>
)

const Settings = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')

  return (
    <AdminPage>
      <AdminPageHeader
        title="Réglages"
        description="Choisissez ce que vous voulez changer."
      />

      <div className="mt-4 space-y-5">
        {groups.map(group => (
          <section key={group.id} aria-labelledby={`settings-${group.id}`}>
            <h2
              id={`settings-${group.id}`}
              className="mb-2 text-sm font-semibold text-muted-foreground"
            >
              {group.title}
            </h2>
            <div className="overflow-hidden rounded-2xl border bg-card">
              {group.entries.map((entry, index) => {
                const Icon = entry.icon
                return (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    className={`flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none ${index ? 'border-t' : ''}`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{entry.title}</span>
                      <span className="block text-xs leading-snug text-muted-foreground">
                        {entry.description}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </AdminPage>
  )
}

export default SettingsPage
