import { describe, expect, it, vi } from 'vitest'
import {
  getAdminCustomerProfile,
  mergeAdminCustomers,
  updateAdminCustomer,
} from '@/lib/admin/customer-profile'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

const now = new Date('2026-08-15T10:00:00.000Z')

const customer = {
  id: 'customer-1',
  identityVersion: 2,
  firstName: 'Marie',
  lastName: 'Dupont',
  email: 'marie@example.com',
  emailNormalized: 'marie@example.com',
  phone: '+41791234567',
  phoneNormalized: '+41791234567',
  searchName: 'marie dupont',
  firstSeenAt: new Date('2025-01-01T10:00:00.000Z'),
  lastSeenAt: new Date('2026-08-01T10:00:00.000Z'),
  internalNote: null,
  preferences: null,
}

describe('admin customer profile', () => {
  it('loads bounded appointments and keeps every status distinct', async () => {
    const findManyAppointments = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'future-1' }])
      .mockResolvedValueOnce([{ id: 'past-1' }])
    const database = {
      customer: {
        findFirst: vi.fn().mockResolvedValue(customer),
        findMany: vi.fn().mockResolvedValue([{ id: 'duplicate-1' }]),
      },
      appointment: {
        findMany: findManyAppointments,
        groupBy: vi.fn().mockResolvedValue([
          { status: 'CONFIRMED', _count: { _all: 3 } },
          { status: 'COMPLETED', _count: { _all: 4 } },
          { status: 'CANCELLED', _count: { _all: 2 } },
          { status: 'NO_SHOW', _count: { _all: 1 } },
        ]),
        // Deux des trois rendez-vous confirmés sont déjà passés.
        count: vi.fn().mockResolvedValue(2),
      },
    } as unknown as PrismaClient

    const profile = await getAdminCustomerProfile(database, customer.id, now)

    expect(profile).toMatchObject({
      totalAppointments: 10,
      // Quatre marqués « terminé » par l'ancienne interface, deux déduits de la
      // date : le bouton n'existe plus, le compte reste juste.
      totalVisits: 6,
      statusCounts: {
        CONFIRMED: 3,
        COMPLETED: 4,
        CANCELLED: 2,
        NO_SHOW: 1,
      },
    })
    expect(findManyAppointments).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ take: 10 }),
    )
    expect(findManyAppointments).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ take: 30 }),
    )
    expect(database.appointment.count).toHaveBeenCalledWith({
      where: {
        customerId: customer.id,
        status: 'CONFIRMED',
        endsAt: { lt: now },
      },
    })
  })

  it('propagates corrected details only to future confirmed snapshots', async () => {
    const transaction = {
      customer: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(customer)
          .mockResolvedValueOnce(null),
        update: vi.fn().mockResolvedValue({ id: 'customer-1' }),
      },
      appointment: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
    }
    const database = {
      $transaction: vi.fn(callback => callback(transaction)),
    } as unknown as PrismaClient

    await expect(
      updateAdminCustomer(database, {
        customerId: customer.id,
        firstName: 'Maria',
        lastName: 'Dupont',
        email: 'maria@example.com',
        phone: '+41791234567',
        internalNote: 'Préfère le calme',
        preferences: 'Matin',
        propagateFuture: true,
        now,
      }),
    ).resolves.toEqual({ propagatedAppointments: 2 })
    expect(transaction.appointment.updateMany).toHaveBeenCalledWith({
      where: {
        customerId: customer.id,
        status: 'CONFIRMED',
        startsAt: { gte: now },
      },
      data: {
        customerFirstName: 'Maria',
        customerLastName: 'Dupont',
        customerSearchName: 'maria dupont',
        customerEmail: 'maria@example.com',
        customerPhone: '+41791234567',
      },
    })
    expect(
      JSON.stringify(transaction.auditEvent.create.mock.calls),
    ).not.toContain('maria@example.com')
  })

  it('preserves every appointment snapshot without explicit propagation', async () => {
    const transaction = {
      customer: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(customer)
          .mockResolvedValueOnce(null),
        update: vi.fn().mockResolvedValue({ id: 'customer-1' }),
      },
      appointment: { updateMany: vi.fn() },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
    }
    const database = {
      $transaction: vi.fn(callback => callback(transaction)),
    } as unknown as PrismaClient

    await updateAdminCustomer(database, {
      customerId: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      internalNote: null,
      preferences: null,
      propagateFuture: false,
      now,
    })

    expect(transaction.appointment.updateMany).not.toHaveBeenCalled()
  })

  it('rejects an e-mail already used by another record', async () => {
    const transaction = {
      customer: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(customer)
          .mockResolvedValueOnce({ id: 'customer-2' }),
        update: vi.fn(),
      },
      appointment: { updateMany: vi.fn() },
    }
    const database = {
      $transaction: vi.fn(callback => callback(transaction)),
    } as unknown as PrismaClient

    await expect(
      updateAdminCustomer(database, {
        customerId: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: 'duplicate@example.com',
        phone: customer.phone,
        internalNote: null,
        preferences: null,
        propagateFuture: false,
      }),
    ).rejects.toMatchObject({
      code: 'IDENTITY_CONFLICT',
    })
    expect(transaction.customer.update).not.toHaveBeenCalled()
  })

  it('merges relations without rewriting historical snapshots and audits it', async () => {
    const transaction = {
      customer: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            id: 'target',
            firstSeenAt: new Date('2025-01-01T10:00:00.000Z'),
            lastSeenAt: new Date('2026-06-01T10:00:00.000Z'),
            internalNote: 'Note cible',
            preferences: null,
          })
          .mockResolvedValueOnce({
            id: 'source',
            firstSeenAt: new Date('2024-01-01T10:00:00.000Z'),
            lastSeenAt: new Date('2026-08-01T10:00:00.000Z'),
            internalNote: 'Note source',
            preferences: 'Après-midi',
          }),
        update: vi.fn().mockResolvedValue({ id: 'target' }),
        delete: vi.fn().mockResolvedValue({ id: 'source' }),
      },
      appointment: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
    }
    const database = {
      $transaction: vi.fn((callback, _options) => callback(transaction)),
    } as unknown as PrismaClient

    await expect(
      mergeAdminCustomers(database, 'target', 'source'),
    ).resolves.toEqual({ movedAppointments: 3 })
    expect(transaction.appointment.updateMany).toHaveBeenCalledWith({
      where: { customerId: 'source' },
      data: { customerId: 'target' },
    })
    expect(database.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityId: 'target',
        action: 'MERGED',
        changes: {
          before: {},
          after: { sourceCustomerId: 'source', sourceAppointmentCount: 3 },
        },
      }),
    })
  })
})
