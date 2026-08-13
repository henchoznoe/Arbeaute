import { ChevronRight, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import {
  type AuditEventItem,
  auditActionLabels,
  auditActorLabels,
  auditEntityLabels,
  formatAuditChanges,
  formatAuditCreatedAt,
  getAuditEntityHref,
} from '@/lib/admin/audit'

export const AuditList = ({
  events,
}: Readonly<{ events: AuditEventItem[] }>) => {
  if (!events.length)
    return (
      <EmptyState
        title="Aucun événement d’audit"
        description="Les mutations correspondant aux filtres apparaîtront ici."
        className="border-0 bg-muted/60 py-8"
      />
    )

  return (
    <ol className="space-y-2">
      {events.map(event => {
        const href = getAuditEntityHref(event)
        const changes = formatAuditChanges(event.changes)
        return (
          <li
            key={event.id}
            className="rounded-2xl border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
                aria-hidden="true"
              >
                <ClipboardCheck className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {auditActionLabels[event.action]}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    par {auditActorLabels[event.actorType]}
                  </span>
                </div>
                <p className="mt-2 break-words text-sm font-medium">
                  {auditEntityLabels[event.entityType]}
                  {event.entityLabel ? ` · ${event.entityLabel}` : ''}
                </p>
                {changes.length ? (
                  <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
                    {changes.map(change => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-2 flex min-h-7 flex-wrap items-center justify-between gap-2">
                  <time
                    dateTime={event.createdAt.toISOString()}
                    className="text-xs text-muted-foreground"
                  >
                    {formatAuditCreatedAt(event.createdAt)}
                  </time>
                  {href ? (
                    <Link
                      href={href}
                      className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary"
                    >
                      Ouvrir
                      <ChevronRight className="size-3.5" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
