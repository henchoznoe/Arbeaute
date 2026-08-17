/**
 * Suivi de l'offre gratuite Resend.
 *
 * L'offre gratuite autorise 100 envois par jour et 3 000 par mois. Ces bornes
 * sont comptées ici à partir des envois réellement réussis, pour qu'un
 * dépassement se voie dans l'administration avant de bloquer les envois.
 */

export const RESEND_FREE_DAILY_LIMIT = 100
export const RESEND_FREE_MONTHLY_LIMIT = 3_000

/** À partir de ce taux d'occupation, l'écran d'administration alerte. */
const WARNING_RATIO = 0.8

export interface QuotaUsage {
  sentToday: number
  sentThisMonth: number
}

export interface QuotaStatus {
  sentToday: number
  sentThisMonth: number
  dailyLimit: number
  monthlyLimit: number
  dailyRatio: number
  monthlyRatio: number
  level: 'ok' | 'warning' | 'reached'
  message: string
}

export const buildQuotaStatus = ({
  sentToday,
  sentThisMonth,
}: QuotaUsage): QuotaStatus => {
  const dailyRatio = sentToday / RESEND_FREE_DAILY_LIMIT
  const monthlyRatio = sentThisMonth / RESEND_FREE_MONTHLY_LIMIT
  const reached =
    sentToday >= RESEND_FREE_DAILY_LIMIT ||
    sentThisMonth >= RESEND_FREE_MONTHLY_LIMIT
  const warning = dailyRatio >= WARNING_RATIO || monthlyRatio >= WARNING_RATIO

  const level: QuotaStatus['level'] = reached
    ? 'reached'
    : warning
      ? 'warning'
      : 'ok'

  const message = reached
    ? 'La limite gratuite est atteinte : les prochains e-mails ne partiront pas avant demain. Les rendez-vous, eux, continuent de fonctionner normalement.'
    : warning
      ? 'Vous approchez de la limite gratuite. Au-delà, les e-mails cessent de partir — sans jamais empêcher une réservation.'
      : 'Envois dans les limites de l’offre gratuite.'

  return {
    sentToday,
    sentThisMonth,
    dailyLimit: RESEND_FREE_DAILY_LIMIT,
    monthlyLimit: RESEND_FREE_MONTHLY_LIMIT,
    dailyRatio,
    monthlyRatio,
    level,
    message,
  }
}

/** Un envoi n'est tenté que si les deux compteurs laissent de la marge. */
export const canSendWithinQuota = (usage: QuotaUsage): boolean =>
  usage.sentToday < RESEND_FREE_DAILY_LIMIT &&
  usage.sentThisMonth < RESEND_FREE_MONTHLY_LIMIT
