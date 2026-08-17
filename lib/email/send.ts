import { isEmailConfigured } from '@/lib/core/env'
import prisma from '@/lib/core/prisma'
import { type MailEnvelope, sendMailThroughResend } from '@/lib/email/client'
import { canSendWithinQuota } from '@/lib/email/quota'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import type { EmailKind } from '@/prisma/generated/prisma/enums'

/**
 * Envoi d'un e-mail transactionnel, toujours secondaire.
 *
 * Cette fonction ne rejette jamais : elle est appelée après qu'un rendez-vous
 * est déjà enregistré, et aucune panne de Resend ne doit remonter jusqu'à
 * l'écran. Chaque tentative laisse une ligne dans `email_delivery`, qu'elle
 * réussisse ou non, pour être visible et renvoyable depuis l'administration.
 */

interface DeliveryRequest extends MailEnvelope {
  kind: EmailKind
  appointmentId?: string | null
}

const startOfLocalDay = (now: Date): Date => {
  const parts = new Intl.DateTimeFormat('fr-CH', {
    timeZone: RESERVATION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: string) =>
    Number(parts.find(part => part.type === type)?.value ?? '0')
  return new Date(
    Date.UTC(value('year'), value('month') - 1, value('day')) - 2 * 60 * 60_000,
  )
}

const startOfMonth = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

const readUsage = async (now: Date) => {
  const [sentToday, sentThisMonth] = await Promise.all([
    prisma.emailDelivery.count({
      where: { status: 'SENT', sentAt: { gte: startOfLocalDay(now) } },
    }),
    prisma.emailDelivery.count({
      where: { status: 'SENT', sentAt: { gte: startOfMonth(now) } },
    }),
  ])
  return { sentToday, sentThisMonth }
}

export const deliverEmail = async (
  request: DeliveryRequest,
): Promise<'sent' | 'failed' | 'skipped'> => {
  try {
    if (!isEmailConfigured) return 'skipped'
    if (!request.to) return 'skipped'

    const now = new Date()
    if (!canSendWithinQuota(await readUsage(now))) {
      await prisma.emailDelivery.create({
        data: {
          kind: request.kind,
          status: 'FAILED',
          recipient: request.to,
          subject: request.subject,
          appointmentId: request.appointmentId ?? null,
          error:
            'Limite de l’offre gratuite atteinte : l’envoi n’a pas été tenté.',
        },
      })
      return 'failed'
    }

    const result = await sendMailThroughResend(request)
    await prisma.emailDelivery.create({
      data: {
        kind: request.kind,
        status: result.ok ? 'SENT' : 'FAILED',
        recipient: request.to,
        subject: request.subject,
        appointmentId: request.appointmentId ?? null,
        providerId: result.ok ? result.providerId : null,
        error: result.ok ? null : result.error,
        sentAt: result.ok ? new Date() : null,
      },
    })
    return result.ok ? 'sent' : 'failed'
  } catch {
    // Dernier filet : même une base indisponible ne doit pas remonter ici.
    return 'failed'
  }
}
