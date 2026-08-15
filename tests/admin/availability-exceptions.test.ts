import { describe, expect, it, vi } from 'vitest'
import {
  AdminAvailabilityExceptionError,
  createAvailabilityExceptionGroupSerializable,
  deleteAvailabilityExceptionGroupAudited,
} from '@/lib/admin/availability-exceptions'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

const rows = [
  {
    type: 'UNAVAILABLE' as const,
    startsAt: new Date('2026-08-20T06:00:00.000Z'),
    endsAt: new Date('2026-08-20T16:00:00.000Z'),
    label: 'Formation',
  },
]

describe('availability exception groups', () => {
  it('checks conflicts and creates the whole group in one audited transaction', async () => {
    const transaction = {
      availabilityException: {
        findFirst: vi.fn().mockResolvedValue(null),
        createManyAndReturn: vi.fn().mockResolvedValue([{ id: 'exception' }]),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit' }) },
    }
    const database = {
      $transaction: vi.fn(async callback => callback(transaction)),
    } as unknown as PrismaClient

    await expect(
      createAvailabilityExceptionGroupSerializable(database, {
        groupId: 'group',
        rows,
        label: 'Formation',
      }),
    ).resolves.toBe(1)
    expect(
      transaction.availabilityException.createManyAndReturn,
    ).toHaveBeenCalledWith({
      data: [{ ...rows[0], groupId: 'group' }],
      select: { id: true },
    })
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'CREATED',
        entityType: 'AVAILABILITY_EXCEPTION',
        entityId: 'exception',
      }),
    })
    expect(database.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
  })

  it('rejects a server-side overlap before writing the group', async () => {
    const createManyAndReturn = vi.fn()
    const transaction = {
      availabilityException: {
        findFirst: vi.fn().mockResolvedValue({ id: 'existing' }),
        createManyAndReturn,
      },
    }
    const database = {
      $transaction: vi.fn(async callback => callback(transaction)),
    } as unknown as PrismaClient

    await expect(
      createAvailabilityExceptionGroupSerializable(database, {
        groupId: 'group',
        rows,
        label: null,
      }),
    ).rejects.toEqual(new AdminAvailabilityExceptionError('OVERLAP'))
    expect(createManyAndReturn).not.toHaveBeenCalled()
  })

  it('deletes and audits all rows belonging to the selected group', async () => {
    const transaction = {
      availabilityException: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'first', ...rows[0], groupId: 'group' },
          {
            id: 'second',
            ...rows[0],
            groupId: 'group',
            startsAt: new Date('2026-08-21T06:00:00.000Z'),
            endsAt: new Date('2026-08-21T16:00:00.000Z'),
          },
        ]),
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit' }) },
    }
    const database = {
      $transaction: vi.fn(async callback => callback(transaction)),
    } as unknown as PrismaClient

    await expect(
      deleteAvailabilityExceptionGroupAudited(database, 'group'),
    ).resolves.toBe(2)
    expect(transaction.availabilityException.deleteMany).toHaveBeenCalledWith({
      where: { groupId: 'group' },
    })
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'DELETED' }),
    })
  })
})
