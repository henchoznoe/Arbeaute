import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import {
  attachAppointmentsToPackage,
  cancelCustomerPackage,
  decidePackageCredit,
  detachAppointmentFromPackage,
  extendCustomerPackage,
  updateCustomerPackageInstallments,
} from '@/lib/actions/packages'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import {
  formatInstallmentChoice,
  getPackageCreditSummary,
  getPackageExpiry,
} from '@/lib/packages/domain'
import {
  addLocalDays,
  formatAppointmentDate,
  getLocalDateKey,
} from '@/lib/reservation/time'
import { formatPrice } from '@/lib/utils/format'
import type { AppointmentStatus } from '@/prisma/generated/prisma/enums'

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: 'Confirmé',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  NO_SHOW: 'Absence',
}

interface CustomerPackagePageProps {
  params: Promise<{ id: string }>
}

const CustomerPackagePage = (props: Readonly<CustomerPackagePageProps>) => (
  <Suspense fallback={<AdminSkeleton variant="form" />}>
    <CustomerPackage {...props} />
  </Suspense>
)

const CustomerPackage = async ({
  params,
}: Readonly<CustomerPackagePageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { id } = await params
  const item = await prisma.customerPackage.findUnique({
    where: { id },
    include: {
      customer: true,
      allowedServices: true,
      sessions: {
        orderBy: { appointment: { startsAt: 'asc' } },
        include: { appointment: true },
      },
    },
  })
  if (!item) notFound()
  const credits = getPackageCreditSummary(
    item.sessionCountSnapshot,
    item.sessions,
  )
  const expiry = getPackageExpiry({
    validityStartsAt: item.validityStartsAt,
    validityMonths: item.validityMonthsSnapshot,
    expiresAtOverride: item.expiresAtOverride,
  })
  const now = new Date()
  const candidates = await prisma.appointment.findMany({
    where: {
      customerId: item.customerId,
      serviceId: { in: item.allowedServices.map(service => service.serviceId) },
      packageSession: null,
      status: 'CONFIRMED',
      startsAt: { gt: now, ...(expiry ? { lte: expiry } : {}) },
    },
    orderBy: { startsAt: 'asc' },
    take: 20,
  })
  const hasFutureAppointment = item.sessions.some(
    session =>
      session.appointment.status === 'CONFIRMED' &&
      session.appointment.startsAt > now,
  )
  const hasPendingDecision = item.sessions.some(
    session => session.creditState === 'DECISION_REQUIRED',
  )
  return (
    <AdminPage>
      <AdminPageHeader
        backHref={`/admin/customers/${item.customerId}`}
        backLabel="Client"
        title={item.packageNameSnapshot}
        description={`${credits.remaining} séance${credits.remaining > 1 ? 's' : ''} restante${credits.remaining > 1 ? 's' : ''} · prix total ${formatPrice(item.packagePriceCents)} · ${formatInstallmentChoice(item.installmentCount).toLowerCase()} sur place`}
      />
      {item.status === 'ACTIVE' &&
      credits.remaining > 0 &&
      (!expiry || expiry > now) ? (
        <div className="mt-5">
          <Link
            href={`/admin/appointments/new?customerPackageId=${item.id}`}
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground"
          >
            Planifier une séance
          </Link>
        </div>
      ) : null}
      <section className="mt-5 rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Paiement sur place</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Modalité globale convenue avec la personne. Elle n’attribue pas un
          montant à chaque rendez-vous.
        </p>
        <form
          action={updateCustomerPackageInstallments}
          className="mt-3 flex flex-wrap gap-2"
        >
          <input type="hidden" name="id" value={item.id} />
          <select
            name="installmentCount"
            defaultValue={String(item.installmentCount)}
            className="min-h-11 rounded-xl border bg-background px-3"
          >
            <option value="1">En une fois</option>
            <option value="2">En 2 fois</option>
            <option value="3">En 3 fois</option>
          </select>
          <button type="submit" className="rounded-xl border px-4">
            Enregistrer
          </button>
        </form>
      </section>
      <section className="mt-5 rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Validité</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {expiry
            ? `Jusqu’au ${getLocalDateKey(expiry)}`
            : 'Commencera au premier rendez-vous.'}
        </p>
        {item.status === 'ACTIVE' && expiry ? (
          <form
            action={extendCustomerPackage}
            className="mt-3 flex flex-wrap gap-2"
          >
            <input type="hidden" name="id" value={item.id} />
            <input
              type="date"
              name="expiresOn"
              required
              min={addLocalDays(getLocalDateKey(expiry), 1)}
              className="min-h-11 rounded-xl border bg-background px-3"
            />
            <button type="submit" className="rounded-xl border px-4">
              Prolonger
            </button>
          </form>
        ) : null}
      </section>
      <section className="mt-4 rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Séances</h2>
        <div className="mt-3 space-y-2">
          {item.sessions.map(session => (
            <article key={session.id} className="rounded-xl border p-3">
              <p className="font-medium">
                {session.appointment.serviceNameSnapshot}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatAppointmentDate(session.appointment.startsAt)} ·{' '}
                {appointmentStatusLabels[session.appointment.status]}
              </p>
              {session.creditState === 'DECISION_REQUIRED' ? (
                <form action={decidePackageCredit} className="mt-3 flex gap-2">
                  <input type="hidden" name="sessionId" value={session.id} />
                  <button
                    type="submit"
                    name="decision"
                    value="COUNTED"
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    Compter cette séance
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="RETURNED"
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    Rendre cette séance
                  </button>
                </form>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {session.creditState === 'RETURNED'
                    ? 'Séance rendue'
                    : 'Crédit compté'}
                </p>
              )}
              {session.appointment.status === 'CONFIRMED' &&
              session.appointment.startsAt > now ? (
                <form action={detachAppointmentFromPackage} className="mt-3">
                  <input type="hidden" name="sessionId" value={session.id} />
                  <button
                    type="submit"
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    Détacher du forfait
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      {item.status === 'ACTIVE' &&
      credits.remaining > 0 &&
      candidates.length > 0 ? (
        <section className="mt-4 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Rattacher des rendez-vous</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vous pouvez en choisir plusieurs d’une même série.
          </p>
          <form action={attachAppointmentsToPackage} className="mt-3 space-y-2">
            <input type="hidden" name="customerPackageId" value={item.id} />
            {candidates.map(appointment => (
              <label
                key={appointment.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border p-3"
              >
                <input
                  type="checkbox"
                  name="appointmentId"
                  value={appointment.id}
                />
                <span className="text-sm">
                  {appointment.serviceNameSnapshot}
                  <span className="block text-xs text-muted-foreground">
                    {formatAppointmentDate(appointment.startsAt)}
                  </span>
                </span>
              </label>
            ))}
            <button
              type="submit"
              className="rounded-lg border px-3 py-2 text-sm"
            >
              Rattacher la sélection
            </button>
          </form>
        </section>
      ) : null}
      {item.status === 'ACTIVE' ? (
        <section className="mt-4 rounded-2xl border border-destructive/30 bg-card p-5">
          <h2 className="font-semibold">Annuler ce forfait</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasFutureAppointment
              ? 'Annulez ou détachez d’abord les rendez-vous à venir.'
              : hasPendingDecision
                ? 'Décidez d’abord si la séance annulée ou manquée doit être comptée.'
                : 'Cette action ferme le forfait. Son historique reste consultable.'}
          </p>
          <form action={cancelCustomerPackage} className="mt-3">
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              disabled={hasFutureAppointment || hasPendingDecision}
              className="rounded-xl border border-destructive/40 px-4 py-2 text-destructive disabled:opacity-50"
            >
              Annuler le forfait
            </button>
          </form>
        </section>
      ) : null}
    </AdminPage>
  )
}

export default CustomerPackagePage
