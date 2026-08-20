import { after } from 'next/server'
import { env, isEmailConfigured } from '@/lib/core/env'
import { deliverEmail } from '@/lib/email/send'
import {
  buildLateRequestDeclinedMail,
  buildLateRequestReceivedMail,
  buildLateRequestSubmittedMail,
  type LateRequestMailData,
} from '@/lib/email/templates'
import { formatServiceLabel } from '@/lib/reservation/service-label'

/**
 * Les messages de la boucle « demande de dernière minute ».
 *
 * Ils vivent à part de `notifications.ts` pour deux raisons : ils partent d'une
 * demande et non d'un rendez-vous, et l'un d'eux va à Arzu. Jusqu'ici elle ne
 * recevait qu'un seul message, le bilan du dimanche, envoyé par le cron — c'est
 * le premier qui parte d'une action faite sur le site.
 *
 * Comme ailleurs, tout passe par `after()` : la personne voit sa demande partir
 * sans attendre Resend, et une panne d'envoi ne perd jamais la demande, qui est
 * déjà enregistrée.
 */

interface NotifiableRequest {
  customerFirstName: string | null
  customerLastName: string
  customerPhone: string
  customerEmail: string | null
  serviceNameSnapshot: string
  servicePriceCents: number
  requestedStartsAt: Date
  comment?: string | null
  /** Obligatoire : voir `NotifiableAppointment` dans `notifications.ts`. */
  categoryName: string | null
}

const toMailData = (request: NotifiableRequest): LateRequestMailData => ({
  customerFirstName: request.customerFirstName,
  customerLastName: request.customerLastName,
  customerPhone: request.customerPhone,
  serviceLabel: formatServiceLabel(
    request.serviceNameSnapshot,
    request.categoryName,
  ),
  requestedStartsAt: request.requestedStartsAt,
  priceCents: request.servicePriceCents,
  comment: request.comment,
  customerEmail: request.customerEmail,
})

/**
 * Prévient Arzu qu'une demande attend.
 *
 * Sans `ADMIN_NOTIFICATION_EMAIL`, rien ne part et la demande reste visible
 * dans `/admin/demandes` : la pastille de navigation est le filet.
 */
export const notifyLateRequestSubmitted = (
  request: NotifiableRequest,
): string | null => {
  const recipient = env.ADMIN_NOTIFICATION_EMAIL
  if (!recipient || !isEmailConfigured) return null

  const content = buildLateRequestSubmittedMail(toMailData(request))
  after(async () => {
    await deliverEmail({
      kind: 'LATE_REQUEST_SUBMITTED',
      to: recipient,
      ...content,
    })
  })
  return recipient
}

/** Accuse réception auprès de la personne, sans jamais annoncer un rendez-vous. */
export const notifyLateRequestReceived = (
  request: NotifiableRequest,
): string | null => {
  const recipient = request.customerEmail
  if (!recipient || !isEmailConfigured) return null

  const content = buildLateRequestReceivedMail(toMailData(request))
  after(async () => {
    await deliverEmail({
      kind: 'LATE_REQUEST_RECEIVED',
      to: recipient,
      ...content,
    })
  })
  return recipient
}

/** Annonce le refus, et rouvre le téléphone et le calendrier. */
export const notifyLateRequestDeclined = (
  request: NotifiableRequest,
  declineReason: string | null,
): string | null => {
  const recipient = request.customerEmail
  if (!recipient || !isEmailConfigured) return null

  const content = buildLateRequestDeclinedMail({
    ...toMailData(request),
    declineReason,
  })
  after(async () => {
    await deliverEmail({
      kind: 'LATE_REQUEST_DECLINED',
      to: recipient,
      ...content,
    })
  })
  return recipient
}
