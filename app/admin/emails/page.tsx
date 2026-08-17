import { ChevronLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { EmailResendButton } from '@/components/admin/email-resend-button'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  describeEmailError,
  emailKindLabels,
  formatEmailMoment,
  getEmailOverview,
  isResendableKind,
} from '@/lib/admin/emails'
import { isEmailConfigured } from '@/lib/core/env'
import { getAdminSession } from '@/lib/core/session-cookies'

const EmailsPage = () => (
  <Suspense fallback={<AdminSkeleton variant="list" maxWidth="max-w-4xl" />}>
    <Emails />
  </Suspense>
)

const Emails = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { deliveries, failedCount, quota } = await getEmailOverview()

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
      >
        <Link href="/admin/settings">
          <ChevronLeft className="size-4" /> Réglages
        </Link>
      </Button>

      <header className="mt-2">
        <h1 className="font-heading text-title font-bold">E-mails envoyés</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Confirmations, déplacements, annulations et rappels de la veille. Un
          e-mail qui ne part pas n’empêche jamais un rendez-vous : il apparaît
          simplement ici, et vous pouvez le renvoyer.
        </p>
      </header>

      {isEmailConfigured ? null : (
        <p
          role="status"
          className="mt-5 rounded-2xl border border-warning-accent bg-warning-subtle p-4 text-sm text-warning-strong"
        >
          L’envoi d’e-mails n’est pas encore activé sur ce site. Les rendez-vous
          fonctionnent normalement, mais personne ne reçoit de message.
        </p>
      )}

      <section
        aria-labelledby="email-quota-title"
        className={`mt-5 rounded-2xl border p-4 ${
          quota.level === 'reached'
            ? 'border-destructive/30 bg-destructive/5'
            : quota.level === 'warning'
              ? 'border-warning-accent bg-warning-subtle'
              : 'border-border bg-card'
        }`}
      >
        <h2
          id="email-quota-title"
          className="flex items-center gap-2 font-semibold"
        >
          <Mail className="size-4 shrink-0" />
          {quota.sentToday} e-mail{quota.sentToday > 1 ? 's' : ''} aujourd’hui,{' '}
          {quota.sentThisMonth} ce mois-ci
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{quota.message}</p>
        <p className="mt-2 text-2xs text-muted-foreground">
          L’offre gratuite couvre {quota.dailyLimit} e-mails par jour et{' '}
          {quota.monthlyLimit.toLocaleString('fr-CH')} par mois.
        </p>
      </section>

      {failedCount > 0 ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {failedCount} e-mail{failedCount > 1 ? 's' : ''} ne{' '}
          {failedCount > 1 ? 'sont' : 's’est'} pas parti
          {failedCount > 1 ? 's' : ''}. Vous pouvez{' '}
          {failedCount > 1 ? 'les' : 'le'} renvoyer ci-dessous.
        </p>
      ) : null}

      <section className="mt-5" aria-label="Derniers e-mails">
        {deliveries.length ? (
          <ul className="space-y-3">
            {deliveries.map(delivery => (
              <li
                key={delivery.id}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {emailKindLabels[delivery.kind]}
                    </p>
                    <p className="mt-0.5 break-all text-sm text-muted-foreground">
                      {delivery.recipient}
                    </p>
                  </div>
                  <StatusBadge
                    variant={delivery.status === 'SENT' ? 'success' : 'danger'}
                    className="shrink-0"
                  >
                    {delivery.status === 'SENT' ? 'Parti' : 'Pas parti'}
                  </StatusBadge>
                </div>

                <p className="mt-2 text-2xs text-muted-foreground">
                  {formatEmailMoment(delivery.createdAt)}
                  {delivery.attempts > 1
                    ? ` · ${delivery.attempts} tentatives`
                    : ''}
                </p>

                {delivery.error ? (
                  <div className="mt-2 rounded-xl bg-destructive/10 p-3 text-xs leading-relaxed text-destructive">
                    <p>{describeEmailError(delivery.error)}</p>
                    <details className="mt-2">
                      <summary className="min-h-11 cursor-pointer content-center font-medium">
                        Détail technique
                      </summary>
                      <p className="mt-1 break-all font-mono text-2xs opacity-80">
                        {delivery.error}
                      </p>
                    </details>
                  </div>
                ) : null}

                {delivery.status === 'FAILED' &&
                isResendableKind(delivery.kind) &&
                delivery.appointmentId ? (
                  <div className="mt-3">
                    <EmailResendButton deliveryId={delivery.id} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Aucun e-mail pour le moment"
            description="Les messages envoyés apparaîtront ici, avec leur résultat."
          />
        )}
      </section>
    </main>
  )
}

export default EmailsPage
