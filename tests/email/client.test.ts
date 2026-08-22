import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/core/env', () => ({
  env: {
    RESEND_API_KEY: 're_test',
    RESEND_FROM: 'Arbeauté <rendez-vous@example.ch>',
  },
}))

const { sendMailThroughResend } = await import('@/lib/email/client')

describe('sendMailThroughResend', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('transmet la clé d’idempotence quand elle est fournie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      sendMailThroughResend({
        to: 'marie@example.ch',
        subject: 'Rappel',
        text: 'Texte',
        html: '<p>Texte</p>',
        idempotencyKey: 'appointment-reminder/apt-1/2026-08-24T08:00:00.000Z',
      }),
    ).resolves.toEqual({ ok: true, providerId: 'email-1' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Idempotency-Key':
            'appointment-reminder/apt-1/2026-08-24T08:00:00.000Z',
        }),
      }),
    )
  })
})
