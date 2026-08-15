import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  anonymizeCustomer,
  createAppointmentsExport,
  createCsv,
  getAnonymizationConfirmation,
  getCustomerAnonymizationPreview,
} from '@/lib/admin/data-management'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

describe('CSV exports', () => {
  it('uses UTF-8, semicolons and neutralizes spreadsheet formulas', () => {
    const csv = createCsv(
      [
        { header: 'nom', value: row => row.name },
        { header: 'note', value: row => row.note },
      ],
      [{ name: 'Dupont; Marie', note: '=IMPORTXML("secret")' }],
    )

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"Dupont; Marie"')
    expect(csv).toContain('"\'=IMPORTXML(""secret"")"')
    expect(csv.endsWith('\r\n')).toBe(true)
  })

  it('applies date and status filters and keeps accounting snapshots', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'appointment-1',
        status: 'COMPLETED',
        source: 'PUBLIC',
        startsAt: new Date('2026-08-10T12:00:00.000Z'),
        endsAt: new Date('2026-08-10T13:00:00.000Z'),
        serviceNameSnapshot: 'Soin visage',
        servicePriceCents: 12_000,
        serviceDurationMinutes: 60,
        customerFirstName: 'Marie',
        customerLastName: 'Dupont',
        customerEmail: 'marie@example.com',
        customerPhone: '+41791234567',
        comment: 'RAS',
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
      },
    ])
    const database = { appointment: { findMany } } as unknown as PrismaClient

    const csv = await createAppointmentsExport(database, {
      from: '2026-08-10',
      to: '2026-08-10',
      status: 'COMPLETED',
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'COMPLETED',
          startsAt: {
            gte: new Date('2026-08-09T22:00:00.000Z'),
            lt: new Date('2026-08-10T22:00:00.000Z'),
          },
        },
        take: 10_000,
      }),
    )
    expect(csv).toContain('"Soin visage";"120.00";"60"')
    expect(csv).toContain('"2026-08-10 14:00"')
  })
})

describe('customer anonymization', () => {
  beforeEach(() => vi.clearAllMocks())

  it('previews the exact number of affected records', async () => {
    const database = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'customer-1',
          firstName: 'Marie',
          lastName: 'Dupont',
          anonymizedAt: null,
          _count: { appointments: 3 },
        }),
      },
      appointmentActivity: { count: vi.fn().mockResolvedValue(5) },
    } as unknown as PrismaClient

    await expect(
      getCustomerAnonymizationPreview(database, 'identity-digest'),
    ).resolves.toEqual({
      customerId: 'customer-1',
      displayName: 'Marie Dupont',
      appointmentCount: 3,
      activityCount: 5,
      confirmation: 'ANONYMISER 3 RENDEZ-VOUS',
    })
  })

  it('removes PII while preserving appointment accounting snapshots', async () => {
    const transaction = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'customer-1',
          anonymizedAt: null,
          _count: { appointments: 2 },
        }),
        update: vi.fn().mockResolvedValue({ id: 'customer-1' }),
      },
      appointment: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
      appointmentActivity: {
        updateMany: vi.fn().mockResolvedValue({ count: 4 }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
    }
    const database = {
      $transaction: vi.fn(callback => callback(transaction)),
    } as unknown as PrismaClient

    await expect(
      anonymizeCustomer(
        database,
        'customer-1',
        getAnonymizationConfirmation(2),
      ),
    ).resolves.toEqual({ appointmentCount: 2, activityCount: 4 })
    expect(transaction.appointment.updateMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-1' },
      data: {
        customerFirstName: null,
        customerLastName: 'Cliente anonymisée',
        customerSearchName: 'cliente anonymisee',
        customerEmail: null,
        customerPhone: null,
        customerIdentityDigest: null,
        comment: null,
      },
    })
    expect(transaction.appointment.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ servicePriceCents: expect.anything() }),
      }),
    )
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'CUSTOMER',
        entityId: 'customer-1',
        action: 'ANONYMIZED',
      }),
    })
  })

  it('rejects an obsolete confirmation before changing any row', async () => {
    const updateMany = vi.fn()
    const transaction = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'customer-1',
          anonymizedAt: null,
          _count: { appointments: 3 },
        }),
      },
      appointment: { updateMany },
    }
    const database = {
      $transaction: vi.fn(callback => callback(transaction)),
    } as unknown as PrismaClient

    await expect(
      anonymizeCustomer(database, 'customer-1', 'ANONYMISER 2 RENDEZ-VOUS'),
    ).rejects.toThrow('INVALID_CONFIRMATION')
    expect(updateMany).not.toHaveBeenCalled()
  })
})
