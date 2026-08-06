import { describe, expect, it } from 'vitest'
import { createSessionToken, verifySessionToken } from '@/lib/core/session'

const secret = 'a-secure-test-secret-that-is-at-least-32-characters'
const now = Date.UTC(2026, 7, 6, 8)

describe('signed sessions', () => {
  it('creates and verifies an admin session', async () => {
    const token = await createSessionToken({
      kind: 'admin',
      subject: 'admin',
      ttlSeconds: 60,
      secret,
      now,
    })

    const payload = await verifySessionToken(token, secret, 'admin', now)

    expect(payload).toMatchObject({
      kind: 'admin',
      subject: 'admin',
      version: 1,
    })
  })

  it('rejects a modified token', async () => {
    const token = await createSessionToken({
      kind: 'customer',
      subject: 'identity-digest',
      version: 4,
      ttlSeconds: 60,
      secret,
      now,
    })
    const modified = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`

    await expect(
      verifySessionToken(modified, secret, 'customer', now),
    ).resolves.toBeNull()
  })

  it('rejects an expired or wrong-kind session', async () => {
    const token = await createSessionToken({
      kind: 'customer',
      subject: 'identity-digest',
      ttlSeconds: 60,
      secret,
      now,
    })

    await expect(
      verifySessionToken(token, secret, 'customer', now + 61_000),
    ).resolves.toBeNull()
    await expect(
      verifySessionToken(token, secret, 'admin', now),
    ).resolves.toBeNull()
  })
})
