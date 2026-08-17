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

describe('normalized customers', () => {
  it('normalizes the searchable name without accents', () => {
    expect(
      normalizeCustomerSearchName(identity.firstName, identity.lastName),
    ).toBe('elodie du chene')
  })

  it('keys the record on the normalized e-mail alone', async () => {
    const customer = {
      id: 'customer-1',
      emailNormalized: 'elodie@example.com',
      phoneNormalized: '+41791234567',
    }
    const transaction = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({ id: 'customer-1' }),
        upsert: vi.fn().mockResolvedValue(customer),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-event' }) },
    } as unknown as Prisma.TransactionClient

    await expect(upsertCustomerIdentity(transaction, identity)).resolves.toBe(
      customer,
    )
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
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: {
        actorType: 'CUSTOMER',
        actorId: 'customer-1',
        entityType: 'CUSTOMER',
        entityId: 'customer-1',
        action: 'UPDATED',
        changes: undefined,
      },
    })
  })

  it('follows the person when only the phone number changed', async () => {
    const customer = {
      id: 'customer-1',
      emailNormalized: 'elodie@example.com',
      phoneNormalized: '+41799999999',
    }
    const transaction = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({ id: 'customer-1' }),
        upsert: vi.fn().mockResolvedValue(customer),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-event' }) },
    } as unknown as Prisma.TransactionClient

    await expect(
      upsertCustomerIdentity(transaction, {
        ...identity,
        phone: '079 999 99 99',
      }),
    ).resolves.toBe(customer)
    expect(transaction.customer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { emailNormalized: 'elodie@example.com' },
        update: expect.objectContaining({ phoneNormalized: '+41799999999' }),
      }),
    )
  })

  it('audits a first booking as a creation', async () => {
    const transaction = {
      customer: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: 'customer-2' }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-event' }) },
    } as unknown as Prisma.TransactionClient

    await upsertCustomerIdentity(transaction, identity)
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'CREATED' }),
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
