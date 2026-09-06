import { ChevronDown, Clock3, MailCheck, MailX } from 'lucide-react'
import { EmailResendButton } from '@/components/admin/email-resend-button'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  describeEmailError,
  emailKindLabels,
  emailStatusLabels,
  emailStatusVariants,
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

export const AppointmentEmailStatus = ({
  deliveries,
}: Readonly<{ deliveries: AppointmentEmailDelivery[] }>) => {
  const latest = deliveries[0]

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">Messages</h2>

      {!latest ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Aucun message envoyé pour ce rendez-vous.
        </p>
      ) : (
        <>
          <p className="mt-2 flex items-center gap-2 text-sm">
            {latest.status === 'SENT' ? (
              <MailCheck className="size-4 shrink-0 text-success" />
            ) : latest.status === 'PENDING' ? (
              <Clock3 className="size-4 shrink-0 text-warning-strong" />
            ) : (
              <MailX className="size-4 shrink-0 text-destructive" />
            )}
            <span>
              {emailKindLabels[latest.kind]} ·{' '}
              <strong>{emailStatusLabels[latest.status].toLowerCase()}</strong>{' '}
              le {formatShortMoment(latest.createdAt)}
            </span>
          </p>

          <details className="group mt-3 border-t pt-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
              Voir {deliveries.length > 1 ? `les ${deliveries.length}` : 'le'}{' '}
              message{deliveries.length > 1 ? 's' : ''}
              <ChevronDown className="ml-auto size-4 transition group-open:rotate-180" />
            </summary>
            <ul className="mt-2 space-y-3">
              {deliveries.map(delivery => {
                const advice = describeEmailError(delivery.error)
                return (
                  <li key={delivery.id} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {emailKindLabels[delivery.kind]}
                      </span>
                      <StatusBadge
                        variant={emailStatusVariants[delivery.status]}
                      >
                        {emailStatusLabels[delivery.status]}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {formatShortMoment(delivery.createdAt)} ·{' '}
                      {delivery.recipient}
                    </p>
                    {advice ? (
                      <p className="mt-2 text-sm text-destructive">{advice}</p>
                    ) : null}
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
                    {delivery.status === 'FAILED' &&
                    isResendableKind(delivery.kind) ? (
                      <div className="mt-3">
                        <EmailResendButton deliveryId={delivery.id} />
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </details>
        </>
      )}
    </section>
  )
}
