import { describe, expect, it, vi } from 'vitest'

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

const makeTransaction = (existing: { id: string } | null) =>
  ({
    customer: {
      findUnique: vi.fn().mockResolvedValue(existing),
      upsert: vi.fn().mockResolvedValue({ id: existing?.id ?? 'customer-2' }),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-event' }) },
  }) as unknown as Prisma.TransactionClient

describe('normalized customers', () => {
  it('normalizes the searchable name without accents', () => {
    expect(
      normalizeCustomerSearchName(identity.firstName, identity.lastName),
    ).toBe('elodie du chene')
  })

  it('keys the record on the normalized e-mail alone', async () => {
    const transaction = makeTransaction({ id: 'customer-1' })

    await upsertCustomerIdentity(transaction, identity)

    expect(transaction.customer.upsert).toHaveBeenCalledWith({
      where: { emailNormalized: 'elodie@example.com' },
      update: {
        firstName: 'Élodie',
        lastName: 'Du Chêne',
        searchName: 'elodie du chene',
        email: 'elodie@example.com',
        phone: '+41791234567',
        phoneNormalized: '+41791234567',
        lastSeenAt: expect.any(Date),
      },
      create: {
        firstName: 'Élodie',
        lastName: 'Du Chêne',
        searchName: 'elodie du chene',
        email: 'elodie@example.com',
        emailNormalized: 'elodie@example.com',
        phone: '+41791234567',
        phoneNormalized: '+41791234567',
      },
    })
  })

  it('n’écrit plus aucun condensé d’identité', async () => {
    const transaction = makeTransaction(null)

    await upsertCustomerIdentity(transaction, identity)

    expect(
      JSON.stringify(
        (transaction.customer.upsert as unknown as { mock: { calls: unknown } })
          .mock.calls,
      ),
    ).not.toContain('identityDigest')
  })

  it('suit la personne quand seul le téléphone a changé', async () => {
    const transaction = makeTransaction({ id: 'customer-1' })

    await upsertCustomerIdentity(transaction, {
      ...identity,
      phone: '079 999 99 99',
    })

    expect(transaction.customer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { emailNormalized: 'elodie@example.com' },
        update: expect.objectContaining({ phoneNormalized: '+41799999999' }),
      }),
    )
  })

  it('audits a first booking as a creation', async () => {
    const transaction = makeTransaction(null)

    await upsertCustomerIdentity(transaction, identity)

    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'CUSTOMER',
        actorId: 'customer-2',
        action: 'CREATED',
      }),
    })
  })

  it('rejects a session whose identity version is obsolete', async () => {
    const findFirst = vi.fn().mockResolvedValue(null)
    const transaction = { customer: { findFirst } } as unknown as Pick<
      Prisma.TransactionClient,
      'customer'
    >

    await expect(
      findCustomerForSession(transaction, {
        subject: 'customer-1',
        version: 2,
      }),
    ).resolves.toBeNull()
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'customer-1', identityVersion: 2, anonymizedAt: null },
      select: { id: true, identityVersion: true },
    })
  })
})
