import { Clock } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { CustomerCallButton } from '@/components/admin/customer-call-button'
import { LateRequestActions } from '@/components/admin/late-request-actions'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { getAdminSession } from '@/lib/core/session-cookies'
import {
  type AdminLateRequest,
  getLateRequestsForAdmin,
  isLateRequestExpired,
} from '@/lib/reservation/late-requests'
import { formatAppointmentDate } from '@/lib/reservation/time'
import { capitalizeFirst, formatPrice } from '@/lib/utils/format'

const LateRequestsPage = () => (
  <Suspense fallback={<AdminSkeleton variant="list" />}>
    <LateRequests />
  </Suspense>
)

const customerLabel = (request: AdminLateRequest): string =>
  [request.customer.firstName, request.customer.lastName]
    .filter(Boolean)
    .join(' ') || 'Sans nom'

const LateRequests = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const requests = await getLateRequestsForAdmin()
  const now = new Date()

  const waiting = requests.filter(
    request =>
      request.status === 'PENDING' && !isLateRequestExpired(request, now),
  )
  const settled = requests.filter(
    request =>
      request.status !== 'PENDING' || isLateRequestExpired(request, now),
  )

  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin"
        backLabel="Agenda"
        eyebrow="Arbeauté"
        title="Demandes de dernière minute"
        icon={Clock}
        description="Des heures encore libres, mais trop proches pour être réservées en ligne. Tant que vous n’avez pas répondu, rien n’est réservé et le créneau reste disponible."
      />

      {waiting.length === 0 ? (
        <EmptyState
          icon={<Clock className="size-5" />}
          title="Aucune demande en attente"
          description="Vous n’avez rien à décider pour le moment."
        />
      ) : (
        <ul className="grid gap-4">
          {waiting.map(request => (
            <li
              key={request.id}
              className="rounded-2xl border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-lg font-bold">
                    {capitalizeFirst(
                      formatAppointmentDate(request.requestedStartsAt),
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {request.serviceNameSnapshot} ·{' '}
                    {request.serviceDurationMinutes} min ·{' '}
                    <span className="text-price">
                      {formatPrice(request.servicePriceCents)}
                    </span>
                  </p>
                </div>
                <StatusBadge variant="warning">En attente</StatusBadge>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
                <p className="text-sm font-medium">{customerLabel(request)}</p>
                <CustomerCallButton
                  phone={request.customer.phone}
                  customerName={customerLabel(request)}
                  className="ml-auto"
                />
              </div>

              {request.comment?.trim() ? (
                <p className="mt-3 rounded-xl bg-muted p-3 text-sm">
                  « {request.comment.trim()} »
                </p>
              ) : null}

              <LateRequestActions
                requestId={request.id}
                momentLabel={formatAppointmentDate(request.requestedStartsAt)}
                customerLabel={customerLabel(request)}
              />
            </li>
          ))}
        </ul>
      )}

      {settled.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-heading text-lg font-bold">Déjà traitées</h2>
          <ul className="mt-4 grid gap-2">
            {settled.map(request => (
              <li
                key={request.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm"
              >
                <span className="min-w-0 font-medium">
                  {capitalizeFirst(
                    formatAppointmentDate(request.requestedStartsAt),
                  )}
                </span>
                <span className="text-muted-foreground">
                  {customerLabel(request)}
                </span>
                <span className="ml-auto">
                  {request.status === 'ACCEPTED' ? (
                    <StatusBadge variant="success">Acceptée</StatusBadge>
                  ) : request.status === 'DECLINED' ? (
                    <StatusBadge variant="neutral">Refusée</StatusBadge>
                  ) : request.status === 'WITHDRAWN' ? (
                    <StatusBadge variant="neutral">Retirée</StatusBadge>
                  ) : (
                    // Une demande en attente dont l'heure est passée : personne
                    // n'a répondu, et il n'y a plus rien à décider.
                    <StatusBadge variant="neutral">Dépassée</StatusBadge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AdminPage>
  )
}

export default LateRequestsPage
