import { describe, expect, it, vi } from 'vitest'
import { env, formatEnvErrors } from '@/lib/core/env'

describe('environment configuration', () => {
  it('exposes validated foundation variables', () => {
    expect(env.DATABASE_URL).toContain('postgresql://')
    expect(env.ADMIN_SESSION_SECRET.length).toBeGreaterThanOrEqual(32)
    expect(env.CUSTOMER_SESSION_SECRET.length).toBeGreaterThanOrEqual(32)
    expect(env.BLOB_STORE_ID).not.toHaveLength(0)
    expect(env.BLOB_WEBHOOK_PUBLIC_KEY).not.toHaveLength(0)
  })

  it('formats validation issues', () => {
    expect(
      formatEnvErrors([
        { path: ['DATABASE_URL'], message: 'Required' },
        { path: ['ADMIN_PASSWORD'], message: 'Too short' },
      ]),
    ).toBe('  - DATABASE_URL: Required\n  - ADMIN_PASSWORD: Too short')
  })
})

describe('variables facultatives laissées vides', () => {
  it('traite une chaîne vide comme une variable absente', async () => {
    // `CRON_SECRET=""` dans un .env.local faisait échouer le démarrage sur
    // `.min(16)`, alors que l'absence de la variable était prévue et gérée.
    vi.resetModules()
    vi.stubEnv('CRON_SECRET', '')
    vi.stubEnv('RESEND_API_KEY', '')

    const { env } = await import('@/lib/core/env')

    expect(env.CRON_SECRET).toBeUndefined()
    expect(env.RESEND_API_KEY).toBeUndefined()
    vi.unstubAllEnvs()
  })
})
