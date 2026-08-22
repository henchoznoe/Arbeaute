import { beforeEach, describe, expect, it, vi } from 'vitest'

const config = vi.hoisted(() => ({
  secret: 'cron-secret-123456' as string | undefined,
}))
const runAppointmentReminders = vi.hoisted(() => vi.fn())

vi.mock('@/lib/core/env', () => ({
  env: {
    get CRON_SECRET() {
      return config.secret
    },
  },
}))
vi.mock('@/lib/email/reminder-run', () => ({ runAppointmentReminders }))

const { GET } = await import('@/app/api/cron/appointment-reminders/route')

describe('route du rappel quotidien', () => {
  beforeEach(() => {
    config.secret = 'cron-secret-123456'
    runAppointmentReminders.mockReset()
    runAppointmentReminders.mockResolvedValue({
      throughDateKey: '2026-08-23',
      sent: 2,
      failed: 0,
      skipped: 1,
      withoutEmail: 1,
    })
  })

  it('refuse de fonctionner sans secret configuré', async () => {
    config.secret = undefined
    const response = await GET(new Request('https://example.ch/api/cron'))
    expect(response.status).toBe(503)
    expect(runAppointmentReminders).not.toHaveBeenCalled()
  })

  it('refuse un mauvais secret', async () => {
    const response = await GET(
      new Request('https://example.ch/api/cron', {
        headers: { Authorization: 'Bearer mauvais-secret' },
      }),
    )
    expect(response.status).toBe(401)
    expect(runAppointmentReminders).not.toHaveBeenCalled()
  })

  it('renvoie uniquement les compteurs du passage autorisé', async () => {
    const response = await GET(
      new Request('https://example.ch/api/cron', {
        headers: { Authorization: 'Bearer cron-secret-123456' },
      }),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      throughDateKey: '2026-08-23',
      sent: 2,
      failed: 0,
      skipped: 1,
      withoutEmail: 1,
    })
  })
})
