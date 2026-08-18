import prisma from '@/lib/core/prisma'
import { buildQuotaStatus } from '@/lib/email/quota'
import type { EmailKind } from '@/prisma/generated/prisma/enums'

const EMAIL_PAGE_SIZE = 25

/**
 * Les deux derniers libellés ne désignent plus rien d'envoyable : le rappel de
 * la veille et le récapitulatif quotidien ont été supprimés. Ils restent
 * traduits parce que des envois passés les portent encore, et que l'historique
 * doit se lire en français plutôt qu'en noms d'énumération.
 */
export const emailKindLabels: Record<EmailKind, string> = {
  BOOKING_CONFIRMATION: 'Confirmation de rendez-vous',
  BOOKING_RESCHEDULED: 'Rendez-vous déplacé',
  BOOKING_CANCELLED: 'Rendez-vous annulé',
  APPOINTMENT_REMINDER: 'Rappel de la veille',
  DAILY_DIGEST: 'Votre récapitulatif du soir',
  WEEKLY_DIGEST: 'Votre bilan de la semaine',
}

/**
 * Seuls les messages déclenchés par une réservation peuvent être reconstruits :
 * ce sont les seuls dont un gabarit existe encore.
 */
const RESENDABLE_KINDS: ReadonlySet<EmailKind> = new Set<EmailKind>([
  'BOOKING_CONFIRMATION',
  'BOOKING_RESCHEDULED',
  'BOOKING_CANCELLED',
])

export const isResendableKind = (kind: EmailKind): boolean =>
  RESENDABLE_KINDS.has(kind)

/**
 * Traduit l'échec technique en une phrase qui dit quoi faire.
 *
 * Le message brut du fournisseur reste stocké et consultable : il sert au
 * diagnostic, mais il n'a rien à faire en première ligne devant Arzu.
 */
export const describeEmailError = (error: string | null): string | null => {
  if (!error) return null
  const lower = error.toLowerCase()

  // Le domaine non vérifié se présente en 403 comme en 422 selon le cas : il
  // se reconnaît au message, pas au code, et ne doit pas être confondu avec
  // une clé refusée — les deux n'appellent pas du tout la même action.
  if (lower.includes('not verified') || lower.includes('domain'))
    return 'Votre domaine d’envoi n’est pas encore vérifié chez Resend. Terminez la vérification, puis renvoyez.'
  if (lower.includes('422') || lower.includes('validation_error'))
    return 'Resend a refusé le destinataire. Tant que votre domaine n’est pas vérifié, seuls vos propres e-mails sont acceptés : terminez la vérification, puis renvoyez.'
  if (lower.includes('401'))
    return 'La clé Resend a été refusée. Vérifiez-la dans la configuration du site, puis renvoyez.'
  if (lower.includes('403'))
    return 'Resend a refusé l’envoi. Vérifiez que votre domaine est vérifié et que la clé a le droit d’envoyer, puis renvoyez.'
  if (lower.includes('429'))
    return 'Trop d’envois d’un coup. Attendez quelques minutes, puis renvoyez.'
  if (lower.includes('dix secondes'))
    return 'Resend n’a pas répondu à temps. Réessayez dans un moment.'
  if (lower.includes('limite'))
    return 'La limite gratuite était atteinte au moment de l’envoi. Renvoyez demain, ou après le renouvellement mensuel.'
  if (lower.startsWith('resend a répondu 5'))
    return 'Resend rencontrait une panne. Réessayez plus tard.'

  return 'L’envoi a échoué. Réessayez ; si cela recommence, prévenez Noé avec le détail ci-dessous.'
}

const startOfMonth = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

const startOfDay = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

export const getEmailOverview = async (now = new Date()) => {
  const [deliveries, failedCount, sentToday, sentThisMonth] = await Promise.all(
    [
      prisma.emailDelivery.findMany({
        orderBy: { createdAt: 'desc' },
        take: EMAIL_PAGE_SIZE,
        select: {
          id: true,
          kind: true,
          status: true,
          recipient: true,
          subject: true,
          error: true,
          attempts: true,
          appointmentId: true,
          createdAt: true,
        },
      }),
      prisma.emailDelivery.count({ where: { status: 'FAILED' } }),
      prisma.emailDelivery.count({
        where: { status: 'SENT', sentAt: { gte: startOfDay(now) } },
      }),
      prisma.emailDelivery.count({
        where: { status: 'SENT', sentAt: { gte: startOfMonth(now) } },
      }),
    ],
  )

  return {
    deliveries,
    failedCount,
    quota: buildQuotaStatus({ sentToday, sentThisMonth }),
  }
}
