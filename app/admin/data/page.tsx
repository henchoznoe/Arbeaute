import { ArchiveRestore, ChevronLeft, Download } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { CustomerAnonymization } from '@/components/admin/customer-anonymization'
import { Button } from '@/components/ui/button'
import { formControlClass } from '@/components/ui/form-field'
import { exportColumnDocumentation } from '@/lib/admin/data-management'
import { getAdminSession } from '@/lib/core/session-cookies'
import { AppointmentStatus } from '@/prisma/generated/prisma/enums'

const statusLabels = {
  CONFIRMED: 'Confirmé',
  CANCELLED: 'Annulé',
  COMPLETED: 'Terminé',
  NO_SHOW: 'Absence',
} as const

const DataPage = () => (
  <Suspense fallback={<AdminSkeleton maxWidth="max-w-5xl" />}>
    <DataManagement />
  </Suspense>
)

const ExportColumns = ({
  columns,
}: Readonly<{ columns: readonly string[] }>) => (
  <ul className="mt-3 min-w-0 space-y-1 text-xs leading-relaxed text-muted-foreground">
    {columns.map(column => (
      <li key={column} className="break-words">
        • {column}
      </li>
    ))}
  </ul>
)

const DataManagement = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')

  return (
    <main className="mx-auto min-h-screen w-full min-w-0 max-w-5xl overflow-x-hidden px-4 py-5 sm:px-8 sm:py-8">
      <Link
        href="/admin/settings"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Réglages
      </Link>

      <header className="mt-2">
        <p className="text-sm font-medium text-rose-500">Arbeauté</p>
        <h1 className="break-words font-heading text-3xl leading-tight font-bold sm:text-4xl">
          Données et confidentialité
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Exportez les données directement sur votre appareil, anonymisez une
          cliente ou consultez la procédure de sauvegarde locale. Aucun fichier
          n’est conservé dans Blob.
        </p>
      </header>

      <section className="mt-7" aria-labelledby="exports-title">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Download className="size-5" />
          </span>
          <div>
            <h2 id="exports-title" className="text-xl font-semibold">
              Exports CSV
            </h2>
            <p className="text-sm text-muted-foreground">
              UTF-8, séparateur point-virgule, maximum 10 000 lignes.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <form
            action="/admin/data/export/appointments"
            method="get"
            className="min-w-0 rounded-3xl border bg-card p-5 shadow-sm"
          >
            <h3 className="font-semibold">Rendez-vous</h3>
            <ExportColumns columns={exportColumnDocumentation.appointments} />
            <div className="mt-4 grid gap-3">
              <label className="text-xs font-medium text-muted-foreground">
                Du
                <input
                  name="from"
                  type="date"
                  className={`mt-1 ${formControlClass}`}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Au
                <input
                  name="to"
                  type="date"
                  className={`mt-1 ${formControlClass}`}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Statut
                <select name="status" className={`mt-1 ${formControlClass}`}>
                  <option value="">Tous</option>
                  {Object.values(AppointmentStatus).map(status => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button type="submit" className="mt-4 w-full">
              Télécharger les rendez-vous
            </Button>
          </form>

          <article className="flex min-w-0 flex-col rounded-3xl border bg-card p-5 shadow-sm">
            <h3 className="font-semibold">Clientes</h3>
            <ExportColumns columns={exportColumnDocumentation.customers} />
            <Button asChild className="mt-auto w-full">
              <a href="/admin/data/export/customers">
                Télécharger les clientes
              </a>
            </Button>
          </article>

          <article className="flex min-w-0 flex-col rounded-3xl border bg-card p-5 shadow-sm">
            <h3 className="font-semibold">Catalogue</h3>
            <ExportColumns columns={exportColumnDocumentation.catalog} />
            <Button asChild className="mt-auto w-full">
              <a href="/admin/data/export/catalog">Télécharger le catalogue</a>
            </Button>
          </article>
        </div>
      </section>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <CustomerAnonymization />
        <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ArchiveRestore className="size-5" />
          </span>
          <h2 className="mt-4 text-xl font-semibold">Sauvegarde locale</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Les scripts créent une archive PostgreSQL locale puis la restaurent
            dans une base jetable, jamais dans la production ni dans la base de
            développement principale.
          </p>
          <div className="mt-5 space-y-2 rounded-2xl bg-muted/60 p-4 text-xs">
            <code className="block break-all">pnpm db:backup:local</code>
            <code className="block break-all">
              pnpm db:restore:verify -- backups/&lt;archive&gt;.dump
            </code>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Procédure détaillée dans docs/data-operations.md.
          </p>
        </section>
      </div>
    </main>
  )
}

export default DataPage
