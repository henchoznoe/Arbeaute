import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/core/session-cookies', () => ({
  createCustomerIdentityDigest: vi.fn(() => 'legacy-digest'),
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

const makeTransaction = (existing: { id: string } | null) => {
  const customer = { id: existing?.id ?? 'customer-2' }
  return {
    customer: {
      findFirst: vi.fn().mockResolvedValue(existing),
      update: vi.fn().mockResolvedValue(customer),
      create: vi.fn().mockResolvedValue(customer),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-event' }) },
  } as unknown as Prisma.TransactionClient
}

describe('normalized customers', () => {
  it('normalizes the searchable name without accents', () => {
    expect(
      normalizeCustomerSearchName(identity.firstName, identity.lastName),
    ).toBe('elodie du chene')
  })

  it('retient la fiche la plus ancienne pour une adresse donnée', async () => {
    const transaction = makeTransaction({ id: 'customer-1' })

    await upsertCustomerIdentity(transaction, identity)

    expect(transaction.customer.findFirst).toHaveBeenCalledWith({
      where: { emailNormalized: 'elodie@example.com' },
      orderBy: [{ firstSeenAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    })
    expect(transaction.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: {
        firstName: 'Élodie',
        lastName: 'Du Chêne',
        searchName: 'elodie du chene',
        email: 'elodie@example.com',
        phone: '+41791234567',
        phoneNormalized: '+41791234567',
        lastSeenAt: expect.any(Date),
      },
    })
    expect(transaction.customer.create).not.toHaveBeenCalled()
  })

  it('ne réécrit pas le condensé de la version précédente sur une fiche connue', async () => {
    const transaction = makeTransaction({ id: 'customer-1' })

    await upsertCustomerIdentity(transaction, identity)

    expect(
      JSON.stringify(
        (transaction.customer.update as unknown as { mock: { calls: unknown } })
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

    expect(transaction.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phoneNormalized: '+41799999999' }),
      }),
    )
  })

  it('écrit le condensé de la version précédente à la création', async () => {
    const transaction = makeTransaction(null)

    await upsertCustomerIdentity(transaction, identity)

    expect(transaction.customer.create).toHaveBeenCalledWith({
      data: {
        firstName: 'Élodie',
        lastName: 'Du Chêne',
        searchName: 'elodie du chene',
        email: 'elodie@example.com',
        emailNormalized: 'elodie@example.com',
        phone: '+41791234567',
        phoneNormalized: '+41791234567',
        identityDigest: 'legacy-digest',
      },
    })
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
