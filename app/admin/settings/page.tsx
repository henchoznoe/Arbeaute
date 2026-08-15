import { Clock3, Database, Settings2, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { getAdminSession } from '@/lib/core/session-cookies'

const SettingsPage = () => (
  <Suspense fallback={<AdminSkeleton maxWidth="max-w-4xl" />}>
    <Settings />
  </Suspense>
)

const Settings = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <header>
        <p className="text-sm font-medium text-brand">Arbeauté</p>
        <h1 className="font-heading text-title font-bold">Réglages</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Gérez les disponibilités de l’institut et les prestations proposées
          aux clientes.
        </p>
      </header>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/settings/booking"
          className="group rounded-3xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <SlidersHorizontal className="size-6" />
          </span>
          <h2 className="mt-5 text-xl font-semibold">Réservation</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Régler le préavis, l’horizon, le délai de modification et le pas des
            créneaux.
          </p>
          <span className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-primary">
            Gérer les règles →
          </span>
        </Link>

        <Link
          href="/admin/availability"
          className="group rounded-3xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Clock3 className="size-6" />
          </span>
          <h2 className="mt-5 text-xl font-semibold">Horaires</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Définir les horaires hebdomadaires, les fermetures et les ouvertures
            exceptionnelles.
          </p>
          <span className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-primary">
            Gérer les horaires →
          </span>
        </Link>

        <Link
          href="/admin/data"
          className="group rounded-3xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Database className="size-6" />
          </span>
          <h2 className="mt-5 text-xl font-semibold">Données</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Exporter les données, anonymiser une cliente et vérifier les
            procédures de sauvegarde et restauration.
          </p>
          <span className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-primary">
            Gérer les données →
          </span>
        </Link>

        <Link
          href="/admin/services"
          className="group rounded-3xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Settings2 className="size-6" />
          </span>
          <h2 className="mt-5 text-xl font-semibold">Prestations</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Modifier le catalogue, les prix, les durées et l’ordre d’affichage
            des soins.
          </p>
          <span className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-primary">
            Gérer les prestations →
          </span>
        </Link>
      </div>
    </main>
  )
}

export default SettingsPage
