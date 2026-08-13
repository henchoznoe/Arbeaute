import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/core/session-cookies', () => ({
  createCustomerIdentityDigest: vi.fn(() => 'identity-digest'),
}))

import {
  findCustomerForSession,
  normalizeCustomerSearchName,
  upsertCustomerIdentity,
} from '@/lib/reservation/customers'
import type { Prisma } from '@/prisma/generated/prisma/client'

const identity = {
  firstName: '  Élodie ',
  lastName: ' Du Chêne ',
  email: ' ELODIE@EXAMPLE.COM ',
  phone: '079 123 45 67',
}

describe('normalized customers', () => {
  it('normalizes the searchable name without accents', () => {
    expect(
      normalizeCustomerSearchName(identity.firstName, identity.lastName),
    ).toBe('elodie du chene')
  })

  it('updates current details only for an exact normalized identity', async () => {
    const customer = {
      id: 'customer-1',
      identityDigest: 'identity-digest',
      emailNormalized: 'elodie@example.com',
      phoneNormalized: '+41791234567',
    }
    const transaction = {
      customer: {
        upsert: vi.fn().mockResolvedValue(customer),
        update: vi.fn().mockResolvedValue(customer),
      },
    } as unknown as Prisma.TransactionClient

    await expect(upsertCustomerIdentity(transaction, identity)).resolves.toBe(
      customer,
    )
    expect(transaction.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: {
        firstName: 'Élodie',
        lastName: 'Du Chêne',
        searchName: 'elodie du chene',
        email: 'elodie@example.com',
        phone: '+41791234567',
        lastSeenAt: expect.any(Date),
      },
    })
  })

  it('refuses an automatic merge when the normalized values differ', async () => {
    const update = vi.fn()
    const transaction = {
      customer: {
        upsert: vi.fn().mockResolvedValue({
          id: 'customer-1',
          identityDigest: 'identity-digest',
          emailNormalized: 'another@example.com',
          phoneNormalized: '+41791234567',
        }),
        update,
      },
    } as unknown as Prisma.TransactionClient

    await expect(
      upsertCustomerIdentity(transaction, identity),
    ).resolves.toBeNull()
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects a session whose identity version is obsolete', async () => {
    const findFirst = vi.fn().mockResolvedValue(null)
    const transaction = { customer: { findFirst } } as unknown as Pick<
      Prisma.TransactionClient,
      'customer'
    >

    await expect(
      findCustomerForSession(transaction, {
        subject: 'identity-digest',
        version: 2,
      }),
    ).resolves.toBeNull()
    expect(findFirst).toHaveBeenCalledWith({
      where: { identityDigest: 'identity-digest', identityVersion: 2 },
      select: { id: true, identityDigest: true, identityVersion: true },
    })
  })
})
