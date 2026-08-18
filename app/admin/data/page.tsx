import { ArchiveRestore, Database, Download } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { CustomerAnonymization } from '@/components/admin/customer-anonymization'
import { DataExportPanel } from '@/components/admin/data-export-panel'
import { Button } from '@/components/ui/button'
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
  <Suspense fallback={<AdminSkeleton variant="list" />}>
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
    <AdminPage className="overflow-x-hidden">
      <AdminPageHeader
        backHref="/admin/settings"
        backLabel="Réglages"
        eyebrow="Arbeauté"
        title="Données et confidentialité"
        icon={Database}
        description="Téléchargez vos données sur votre appareil, effacez les coordonnées d’une personne qui le demande, ou consultez la marche à suivre pour sauvegarder. Rien n’est stocké en ligne au passage."
      />

      <section className="mt-6" aria-labelledby="exports-title">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Download className="size-5" />
          </span>
          <div>
            <h2 id="exports-title" className="text-xl font-semibold">
              Télécharger vos données
            </h2>
            <p className="text-sm text-muted-foreground">
              Des fichiers qui s’ouvrent dans Excel ou Numbers, 10 000 lignes au
              maximum par fichier.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <article className="flex min-w-0 flex-col rounded-3xl border bg-card p-5 shadow-sm">
            <h3 className="font-semibold">Rendez-vous</h3>
            <ExportColumns columns={exportColumnDocumentation.appointments} />
            <div className="mt-auto grid gap-2 pt-4">
              <Button asChild>
                <a href="/admin/data/export/appointments">
                  Télécharger les rendez-vous
                </a>
              </Button>
              <DataExportPanel
                statusOptions={Object.values(AppointmentStatus).map(status => ({
                  value: status,
                  label: statusLabels[status],
                }))}
              />
            </div>
          </article>

          <article className="flex min-w-0 flex-col rounded-3xl border bg-card p-5 shadow-sm">
            <h3 className="font-semibold">Clients</h3>
            <ExportColumns columns={exportColumnDocumentation.customers} />
            <Button asChild className="mt-auto w-full">
              <a href="/admin/data/export/customers">Télécharger les clients</a>
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

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
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
    </AdminPage>
  )
}

export default DataPage
