import { ChevronLeft, ChevronRight, History } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ActivityTabs } from '@/components/admin/activity-tabs'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AuditFilterPanel } from '@/components/admin/audit-filter-panel'
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
  <Suspense fallback={<AdminSkeleton variant="list" />}>
    <AuditHistory searchParams={searchParams} />
  </Suspense>
)

const enumOptions = <Value extends string>(
  values: Record<string, Value>,
  labels: Record<Value, string>,
): Array<{ value: string; label: string }> =>
  Object.values(values).map(value => ({ value, label: labels[value] }))

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

  const activeCount = [filters.actor, filters.entity, filters.action].filter(
    Boolean,
  ).length

  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin"
        backLabel="Agenda"
        eyebrow="Arbeauté"
        title="Activité"
        icon={History}
        description={`${totalCount} modification${totalCount > 1 ? 's' : ''} enregistrée${totalCount > 1 ? 's' : ''}. Cet historique ne peut pas être effacé.`}
        actions={
          <AuditFilterPanel
            activeCount={activeCount}
            fields={[
              {
                name: 'actor',
                label: 'Qui',
                allLabel: 'Tous',
                value: filters.actor ?? '',
                options: enumOptions(AuditActorType, auditActorLabels),
              },
              {
                name: 'entity',
                label: 'Quoi',
                allLabel: 'Toutes',
                value: filters.entity ?? '',
                options: enumOptions(AuditEntityType, auditEntityLabels),
              },
              {
                name: 'action',
                label: 'Action',
                allLabel: 'Toutes',
                value: filters.action ?? '',
                options: enumOptions(AuditActionType, auditActionLabels),
              },
            ]}
          />
        }
      />

      <ActivityTabs active="audit" />

      <section className="mt-5" aria-label="Historique des modifications">
        <AuditList events={events} />
      </section>

      {totalPages > 1 ? (
        <>
          <nav
            aria-label="Pagination de l’historique"
            className="mt-5 grid grid-cols-2 gap-3 sm:mx-auto sm:max-w-md"
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
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
        </>
      ) : null}
    </AdminPage>
  )
}

export default AuditPage
