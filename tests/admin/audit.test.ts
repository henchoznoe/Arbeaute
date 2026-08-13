import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findMany: vi.fn(),
}))

vi.mock('@/lib/core/prisma', () => ({
  default: {
    auditEvent: {
      count: mocks.count,
      findMany: mocks.findMany,
    },
  },
}))

import {
  formatAuditChanges,
  formatAuditCreatedAt,
  getAuditEntityHref,
  getAuditPage,
  runAuditedMutation,
} from '@/lib/admin/audit'

describe('admin audit journal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('applies entity and action filters to bounded pagination', async () => {
    mocks.count.mockResolvedValue(45)
    mocks.findMany.mockResolvedValue(['event'])

    await expect(
      getAuditPage(99, {
        actor: 'ADMIN',
        entity: 'SERVICE',
        action: 'UPDATED',
      }),
    ).resolves.toEqual({
      events: ['event'],
      page: 3,
      totalPages: 3,
      totalCount: 45,
    })
    const where = {
      actorType: 'ADMIN',
      entityType: 'SERVICE',
      action: 'UPDATED',
    }
    expect(mocks.count).toHaveBeenCalledWith({ where })
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, skip: 40, take: 20 }),
    )
  })

  it('links only to existing admin entity screens', () => {
    expect(
      getAuditEntityHref({
        entityType: 'APPOINTMENT',
        entityId: 'appointment-1',
      }),
    ).toBe('/admin/appointments/appointment-1')
    expect(
      getAuditEntityHref({ entityType: 'CUSTOMER', entityId: 'customer-1' }),
    ).toBeNull()
  })

  it('formats timestamps in the salon time zone', () => {
    expect(formatAuditCreatedAt(new Date('2026-08-10T10:30:00.000Z'))).toBe(
      '10.08.26 12:30',
    )
  })

  it('formats a limited before/after summary without internal identifiers', () => {
    expect(
      formatAuditChanges({
        before: {
          startsAt: '2026-08-10T10:30:00.000Z',
          serviceId: 'secret-id',
        },
        after: { startsAt: '2026-08-11T11:30:00.000Z', serviceId: 'other-id' },
      }),
    ).toEqual(['Début : 10.08.26 12:30 → 11.08.26 13:30'])
  })

  it('fails the mutation when its audit event cannot be written', async () => {
    const transaction = {
      service: { update: vi.fn().mockResolvedValue({ id: 'service-1' }) },
      auditEvent: {
        create: vi.fn().mockRejectedValue(new Error('audit failed')),
      },
    }
    const database = {
      $transaction: vi.fn(callback => callback(transaction)),
    }

    await expect(
      runAuditedMutation(
        database as never,
        current =>
          current.service.update({ where: { id: 'service-1' }, data: {} }),
        service => ({
          actorType: 'ADMIN',
          actorId: 'admin',
          entityType: 'SERVICE',
          entityId: service.id,
          action: 'UPDATED',
        }),
      ),
    ).rejects.toThrow('audit failed')
  })
})
