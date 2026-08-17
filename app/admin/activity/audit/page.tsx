import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ActivityTabs } from '@/components/admin/activity-tabs'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AuditList } from '@/components/admin/audit-list'
import { Button } from '@/components/ui/button'
import {
  type AuditFilters,
  auditActionLabels,
  auditActorLabels,
  auditEntityLabels,
  getAuditPage,
} from '@/lib/admin/audit'
import { getAdminSession } from '@/lib/core/session-cookies'
import {
  AuditActionType,
  AuditActorType,
  AuditEntityType,
} from '@/prisma/generated/prisma/enums'

interface AuditPageProps {
  searchParams: Promise<{
    page?: string
    actor?: string
    entity?: string
    action?: string
  }>
}

const parsePage = (value: string | undefined): number => {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

const enumValue = <Value extends string>(
  values: Record<string, Value>,
  value: string | undefined,
): Value | undefined =>
  value && Object.values(values).includes(value as Value)
    ? (value as Value)
    : undefined

const auditHref = (page: number, filters: AuditFilters): string => {
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  if (filters.actor) params.set('actor', filters.actor)
  if (filters.entity) params.set('entity', filters.entity)
  if (filters.action) params.set('action', filters.action)
  const query = params.toString()
  return `/admin/activity/audit${query ? `?${query}` : ''}`
}

const AuditPage = ({ searchParams }: Readonly<AuditPageProps>) => (
  <Suspense fallback={<AdminSkeleton maxWidth="max-w-4xl" />}>
    <AuditHistory searchParams={searchParams} />
  </Suspense>
)

const AuditHistory = async ({ searchParams }: Readonly<AuditPageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const requested = await searchParams
  const filters: AuditFilters = {
    actor: enumValue(AuditActorType, requested.actor),
    entity: enumValue(AuditEntityType, requested.entity),
    action: enumValue(AuditActionType, requested.action),
  }
  const { events, page, totalPages, totalCount } = await getAuditPage(
    parsePage(requested.page),
    filters,
  )

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-5 sm:px-8 sm:py-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
      >
        <Link href="/admin">
          <ChevronLeft className="size-4" /> Agenda
        </Link>
      </Button>

      <header className="mt-2">
        <p className="text-sm font-medium text-brand">Arbeauté</p>
        <h1 className="font-heading text-title font-bold">Activité</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount} modification{totalCount > 1 ? 's' : ''} enregistrée
          {totalCount > 1 ? 's' : ''}. Cet historique ne peut pas être effacé.
        </p>
      </header>

      <ActivityTabs active="audit" />

      <form className="mt-5 rounded-2xl border bg-card p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="size-4" /> Filtrer l’historique
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-muted-foreground">
            Qui
            <select
              name="actor"
              defaultValue={filters.actor ?? ''}
              className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground"
            >
              <option value="">Tous</option>
              {Object.values(AuditActorType).map(value => (
                <option key={value} value={value}>
                  {auditActorLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Quoi
            <select
              name="entity"
              defaultValue={filters.entity ?? ''}
              className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground"
            >
              <option value="">Toutes</option>
              {Object.values(AuditEntityType).map(value => (
                <option key={value} value={value}>
                  {auditEntityLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Action
            <select
              name="action"
              defaultValue={filters.action ?? ''}
              className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground"
            >
              <option value="">Toutes</option>
              {Object.values(AuditActionType).map(value => (
                <option key={value} value={value}>
                  {auditActionLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex gap-3">
          <Button type="submit" className="flex-1">
            Appliquer
          </Button>
          {filters.actor || filters.entity || filters.action ? (
            <Button asChild variant="outline">
              <Link href="/admin/activity/audit">Effacer</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <section className="mt-5" aria-label="Historique des modifications">
        <AuditList events={events} />
      </section>

      {totalPages > 1 ? (
        <nav
          aria-label="Pagination de l’historique"
          className="mt-5 grid grid-cols-2 gap-3"
        >
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={auditHref(page - 1, filters)}>
                <ChevronLeft className="size-4" /> Précédent
              </Link>
            </Button>
          ) : (
            <span aria-hidden="true" />
          )}
          {page < totalPages ? (
            <Button asChild variant="outline">
              <Link href={auditHref(page + 1, filters)}>
                Suivant <ChevronRight className="size-4" />
              </Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
      {totalPages > 1 ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Page {page} sur {totalPages}
        </p>
      ) : null}
    </main>
  )
}

export default AuditPage
