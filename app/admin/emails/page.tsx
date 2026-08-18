import { Mail } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import {
  AdminPage,
  AdminPageAside,
  AdminPageColumns,
  AdminPageHeader,
} from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { EmailResendButton } from '@/components/admin/email-resend-button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  describeEmailError,
  emailKindLabels,
  getEmailOverview,
  isResendableKind,
} from '@/lib/admin/emails'
import { isEmailConfigured } from '@/lib/core/env'
import { getAdminSession } from '@/lib/core/session-cookies'
import { formatShortMoment } from '@/lib/reservation/time'
import { formatCount } from '@/lib/utils/format'

const EmailsPage = () => (
  <Suspense fallback={<AdminSkeleton variant="list" />}>
    <Emails />
  </Suspense>
)

const Emails = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { deliveries, failedCount, quota } = await getEmailOverview()

  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/settings"
        backLabel="Réglages"
        eyebrow="Arbeauté"
        title="E-mails envoyés"
        icon={Mail}
        description="Confirmations, déplacements, annulations et bilan de la semaine. Un e-mail qui ne part pas n’empêche jamais un rendez-vous : il apparaît simplement ici, et vous pouvez le renvoyer."
      />

      {/* Les compteurs restent à gauche pendant qu'on descend la liste : ce
          sont eux qui expliquent pourquoi un message n'est pas parti. */}
      <AdminPageColumns>
        <AdminPageAside>
          <section
            aria-labelledby="email-quota-title"
            className={`rounded-2xl border p-4 ${
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
              {quota.sentToday} e-mail{quota.sentToday > 1 ? 's' : ''}{' '}
              aujourd’hui, {quota.sentThisMonth} ce mois-ci
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {quota.message}
            </p>
            <p className="mt-2 text-2xs text-muted-foreground">
              L’offre gratuite couvre {quota.dailyLimit} e-mails par jour et{' '}
              {formatCount(quota.monthlyLimit)} par mois.
            </p>
          </section>

          {isEmailConfigured ? null : (
            <p
              role="status"
              className="rounded-2xl border border-warning-accent bg-warning-subtle p-4 text-sm leading-relaxed text-warning-strong"
            >
              L’envoi d’e-mails n’est pas encore activé sur ce site. Les
              rendez-vous fonctionnent normalement, mais personne ne reçoit de
              message.
            </p>
          )}

          {failedCount > 0 ? (
            <p
              role="alert"
              className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-relaxed text-destructive"
            >
              {failedCount} e-mail{failedCount > 1 ? 's' : ''} ne{' '}
              {failedCount > 1 ? 'sont' : 's’est'} pas parti
              {failedCount > 1 ? 's' : ''}. Vous pouvez{' '}
              {failedCount > 1 ? 'les' : 'le'} renvoyer depuis la liste.
            </p>
          ) : null}

          <div className="rounded-2xl border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">
              Ce que le site envoie
            </p>
            <ul className="mt-2 space-y-1">
              <li>· la confirmation, dès qu’un rendez-vous est pris ;</li>
              <li>· le déplacement, quand la date change ;</li>
              <li>· l’annulation, quand le rendez-vous est retiré ;</li>
              <li>· votre bilan de la semaine, le dimanche soir.</li>
            </ul>
          </div>
        </AdminPageAside>

        <section aria-label="Derniers e-mails" className="min-w-0">
          {deliveries.length ? (
            <ul className="grid gap-3 xl:grid-cols-2">
              {deliveries.map(delivery => (
                <li
                  key={delivery.id}
                  className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm"
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
                      variant={
                        delivery.status === 'SENT' ? 'success' : 'danger'
                      }
                      className="shrink-0"
                    >
                      {delivery.status === 'SENT' ? 'Parti' : 'Pas parti'}
                    </StatusBadge>
                  </div>

                  <p className="mt-2 text-2xs text-muted-foreground">
                    {formatShortMoment(delivery.createdAt)}
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
      </AdminPageColumns>
    </AdminPage>
  )
}

export default EmailsPage
