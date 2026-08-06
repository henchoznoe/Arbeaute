import { describe, expect, it } from 'vitest'
import { env, formatEnvErrors } from '@/lib/core/env'

describe('environment configuration', () => {
  it('exposes validated foundation variables', () => {
    expect(env.DATABASE_URL).toContain('postgresql://')
    expect(env.ADMIN_SESSION_SECRET.length).toBeGreaterThanOrEqual(32)
    expect(env.CUSTOMER_SESSION_SECRET.length).toBeGreaterThanOrEqual(32)
    expect(env.BLOB_STORE_ID).not.toHaveLength(0)
    expect(env.BLOB_READ_WRITE_TOKEN).not.toHaveLength(0)
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
