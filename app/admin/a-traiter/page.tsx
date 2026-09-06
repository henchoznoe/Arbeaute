import { AlertTriangle, BadgeCheck, ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { getAdminAttentionSummary } from '@/lib/admin/attention'
import { getAdminSession } from '@/lib/core/session-cookies'

const Attention = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { pendingRequestCount, conflictGroupCount, conflicts, totalCount } =
    await getAdminAttentionSummary()

  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin"
        backLabel="Agenda"
        title="À traiter"
        icon={BadgeCheck}
        description="Les demandes et les rendez-vous qui ont besoin de votre réponse."
      />

      {totalCount === 0 ? (
        <EmptyState
          className="mt-5"
          icon={<BadgeCheck className="size-5" />}
          title="Tout est en ordre"
          description="Aucune demande ni superposition ne demande votre attention."
        />
      ) : (
        <div className="mt-5 grid gap-3">
          {pendingRequestCount > 0 ? (
            <Link
              href="/admin/demandes"
              className="flex min-h-20 items-center gap-3 rounded-2xl border border-warning-line bg-warning-subtle p-4 transition hover:border-warning"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-warning-soft text-warning-strong">
                <Clock className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">
                  {pendingRequestCount === 1
                    ? 'Une demande attend votre réponse'
                    : `${pendingRequestCount} demandes attendent votre réponse`}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Acceptez une heure ou proposez-en une autre.
                </span>
              </span>
              <ChevronRight className="ml-auto size-5 shrink-0" />
            </Link>
          ) : null}

          {conflictGroupCount > 0 ? (
            <Link
              href="/admin/conflits"
              className="flex min-h-20 items-center gap-3 rounded-2xl border border-destructive/35 bg-destructive/5 p-4 transition hover:border-destructive"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">
                  {conflictGroupCount === 1
                    ? 'Une superposition à vérifier'
                    : `${conflictGroupCount} superpositions à vérifier`}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {conflicts.ids.length} rendez-vous concernés.
                </span>
              </span>
              <ChevronRight className="ml-auto size-5 shrink-0" />
            </Link>
          ) : null}
        </div>
      )}
    </AdminPage>
  )
}

const AttentionPage = () => (
  <Suspense fallback={<AdminSkeleton variant="list" />}>
    <Attention />
  </Suspense>
)

export default AttentionPage
