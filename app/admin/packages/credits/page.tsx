import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { decidePackageCredit } from '@/lib/actions/packages'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { formatAppointmentDate } from '@/lib/reservation/time'

const PackageCreditsPage = () => (
  <Suspense fallback={<AdminSkeleton variant="list" />}>
    <PackageCredits />
  </Suspense>
)

const PackageCredits = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const sessions = await prisma.packageSession.findMany({
    where: { creditState: 'DECISION_REQUIRED' },
    orderBy: { appointment: { startsAt: 'desc' } },
    include: {
      appointment: true,
      customerPackage: { include: { customer: true } },
    },
  })
  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/a-traiter"
        backLabel="À traiter"
        title="Séances de forfait à décider"
        description="Une annulation ou une absence ne change jamais le solde sans votre choix."
      />
      <div className="mt-5 space-y-3">
        {sessions.map(session => (
          <article key={session.id} className="rounded-2xl border bg-card p-4">
            <Link
              href={`/admin/customer-packages/${session.customerPackageId}`}
              className="font-semibold hover:underline"
            >
              {session.customerPackage.packageNameSnapshot}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.customerPackage.customer.firstName}{' '}
              {session.customerPackage.customer.lastName} ·{' '}
              {session.appointment.serviceNameSnapshot} ·{' '}
              {formatAppointmentDate(session.appointment.startsAt)}
            </p>
            <form
              action={decidePackageCredit}
              className="mt-4 flex flex-wrap gap-2"
            >
              <input type="hidden" name="sessionId" value={session.id} />
              <button
                type="submit"
                name="decision"
                value="COUNTED"
                className="rounded-xl border px-4 py-2"
              >
                Compter cette séance
              </button>
              <button
                type="submit"
                name="decision"
                value="RETURNED"
                className="rounded-xl border px-4 py-2"
              >
                Rendre cette séance
              </button>
            </form>
          </article>
        ))}
        {sessions.length === 0 ? (
          <p className="rounded-2xl border bg-card p-5 text-muted-foreground">
            Aucune séance à décider.
          </p>
        ) : null}
      </div>
    </AdminPage>
  )
}

export default PackageCreditsPage
