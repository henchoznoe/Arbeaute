import { MailCheck, MailX } from 'lucide-react'
import { EmailResendButton } from '@/components/admin/email-resend-button'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  describeEmailError,
  emailKindLabels,
  isResendableKind,
} from '@/lib/admin/emails'
import { formatShortMoment } from '@/lib/reservation/time'
import type { EmailKind, EmailStatus } from '@/prisma/generated/prisma/enums'

export interface AppointmentEmailDelivery {
  id: string
  kind: EmailKind
  status: EmailStatus
  recipient: string
  error: string | null
  createdAt: Date
}

/**
 * Le sort des messages liés à *ce* rendez-vous.
 *
 * La question d'Arzu n'est pas « quels e-mails sont partis aujourd'hui » mais
 * « est-ce que la personne de 14 h a bien reçu sa confirmation ». Y répondre
 * demandait de quitter le rendez-vous, d'ouvrir les réglages, puis de retrouver
 * l'adresse dans une liste chronologique. La donnée était pourtant déjà là, et
 * déjà indexée par `[appointmentId, createdAt]`.
 *
 * `/admin/emails` garde son rôle : la santé des envois et le quota.
 */
export const AppointmentEmailStatus = ({
  deliveries,
}: Readonly<{ deliveries: AppointmentEmailDelivery[] }>) => (
  <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
    <h2 className="text-lg font-semibold">Messages envoyés</h2>

    {deliveries.length === 0 ? (
      <p className="mt-2 text-sm text-muted-foreground">
        Aucun message n’a encore été envoyé pour ce rendez-vous.
      </p>
    ) : (
      <ul className="mt-3 space-y-3">
        {deliveries.map(delivery => {
          const sent = delivery.status === 'SENT'
          const advice = describeEmailError(delivery.error)
          return (
            <li key={delivery.id} className="rounded-2xl border p-3">
              <div className="flex flex-wrap items-center gap-2">
                {sent ? (
                  <MailCheck className="size-4 shrink-0 text-success" />
                ) : (
                  <MailX className="size-4 shrink-0 text-destructive" />
                )}
                <span className="text-sm font-semibold">
                  {emailKindLabels[delivery.kind]}
                </span>
                <StatusBadge variant={sent ? 'success' : 'danger'}>
                  {sent ? 'Parti' : 'Pas parti'}
                </StatusBadge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {sent ? 'Envoyé le' : 'Tenté le'}{' '}
                {formatShortMoment(delivery.createdAt)} · {delivery.recipient}
              </p>

              {advice ? (
                <p className="mt-2 text-sm leading-relaxed text-destructive">
                  {advice}
                </p>
              ) : null}
              {/* Le message brut du fournisseur reste consultable pour le
                  diagnostic, mais replié : il n'a rien à faire en première
                  ligne. */}
              {delivery.error ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    Détail technique
                  </summary>
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {delivery.error}
                  </p>
                </details>
              ) : null}

              {!sent && isResendableKind(delivery.kind) ? (
                <div className="mt-3">
                  <EmailResendButton deliveryId={delivery.id} />
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    )}
  </section>
)
