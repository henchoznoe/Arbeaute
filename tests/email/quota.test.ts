import { describe, expect, it } from 'vitest'
import {
  buildQuotaStatus,
  canSendWithinQuota,
  RESEND_FREE_DAILY_LIMIT,
  RESEND_FREE_MONTHLY_LIMIT,
} from '@/lib/email/quota'

describe('canSendWithinQuota', () => {
  it('autorise l’envoi sous les deux limites', () => {
    expect(canSendWithinQuota({ sentToday: 10, sentThisMonth: 200 })).toBe(true)
  })

  it('bloque dès que la limite quotidienne est atteinte', () => {
    expect(
      canSendWithinQuota({
        sentToday: RESEND_FREE_DAILY_LIMIT,
        sentThisMonth: 200,
      }),
    ).toBe(false)
  })

  it('bloque dès que la limite mensuelle est atteinte', () => {
    expect(
      canSendWithinQuota({
        sentToday: 1,
        sentThisMonth: RESEND_FREE_MONTHLY_LIMIT,
      }),
    ).toBe(false)
  })
})

describe('buildQuotaStatus', () => {
  it('reste au vert loin des limites', () => {
    const status = buildQuotaStatus({ sentToday: 5, sentThisMonth: 100 })
    expect(status.level).toBe('ok')
    expect(status.message).toContain('limites de l’offre gratuite')
  })

  it('alerte à partir de quatre-vingts pour cent', () => {
    expect(buildQuotaStatus({ sentToday: 80, sentThisMonth: 0 }).level).toBe(
      'warning',
    )
    expect(buildQuotaStatus({ sentToday: 0, sentThisMonth: 2_400 }).level).toBe(
      'warning',
    )
  })

  it('signale la limite atteinte et rassure sur les rendez-vous', () => {
    const status = buildQuotaStatus({
      sentToday: RESEND_FREE_DAILY_LIMIT,
      sentThisMonth: 500,
    })
    expect(status.level).toBe('reached')
    expect(status.message).toContain('continuent de fonctionner')
  })
})
