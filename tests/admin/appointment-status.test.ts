import { describe, expect, it, vi } from 'vitest'
import {
  AdminAppointmentStatusError,
  changeAdminAppointmentStatusSerializable,
} from '@/lib/admin/appointment-status'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

const occupiedStartsAt = new Date('2026-08-15T08:45:00.000Z')
const occupiedEndsAt = new Date('2026-08-15T10:15:00.000Z')

const currentAppointment = (status: 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW') => ({
  id: 'appointment-1',
  status,
  customerId: 'customer-1',
  serviceNameSnapshot: 'Soin visage',
  occupiedStartsAt,
  occupiedEndsAt,
})

const makeDatabase = (status: 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW') => {
  const transaction = {
    appointment: {
      findUnique: vi.fn().mockResolvedValue(currentAppointment(status)),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockImplementation(({ data }) => ({
        id: 'appointment-1',
        status: data.status,
        customerId: 'customer-1',
        serviceNameSnapshot: 'Soin visage',
      })),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
  }
  const database = {
    $transaction: vi.fn(callback => callback(transaction)),
  } as unknown as PrismaClient
  return { database, transaction }
}

describe('admin appointment status transitions', () => {
  it.each(['COMPLETED', 'NO_SHOW'] as const)(
    'changes a confirmed appointment to %s without touching its snapshots',
    async targetStatus => {
      const { database, transaction } = makeDatabase('CONFIRMED')

      await expect(
        changeAdminAppointmentStatusSerializable(
          database,
          'appointment-1',
          targetStatus,
        ),
      ).resolves.toMatchObject({ status: targetStatus })
      expect(transaction.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
        data: { status: targetStatus },
        select: expect.any(Object),
      })
      expect(transaction.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorType: 'ADMIN',
          actorId: 'admin',
          action: 'UPDATED',
          changes: {
            before: { status: 'CONFIRMED' },
            after: { status: targetStatus },
          },
        }),
      })
    },
  )

  it.each(['NO_SHOW', 'CANCELLED'] as const)(
    'restores %s only after a serializable overlap check',
    async currentStatus => {
      const { database, transaction } = makeDatabase(currentStatus)

      await expect(
        changeAdminAppointmentStatusSerializable(
          database,
          'appointment-1',
          'CONFIRMED',
        ),
      ).resolves.toMatchObject({ status: 'CONFIRMED' })
      expect(transaction.appointment.findFirst).toHaveBeenCalledWith({
        where: {
          id: { not: 'appointment-1' },
          status: 'CONFIRMED',
          occupiedStartsAt: { lt: occupiedEndsAt },
          occupiedEndsAt: { gt: occupiedStartsAt },
        },
        select: { id: true },
      })
      expect(transaction.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
        data: { status: 'CONFIRMED', cancelledAt: null },
        select: expect.any(Object),
      })
      expect(database.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      })
      expect(transaction.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'RESTORED',
          changes: {
            before: { status: currentStatus },
            after: { status: 'CONFIRMED' },
          },
        }),
      })
    },
  )

  it('refuses a restore when another confirmed appointment overlaps', async () => {
    const { database, transaction } = makeDatabase('NO_SHOW')
    transaction.appointment.findFirst.mockResolvedValue({ id: 'conflict' })

    await expect(
      changeAdminAppointmentStatusSerializable(
        database,
        'appointment-1',
        'CONFIRMED',
      ),
    ).rejects.toEqual(new AdminAppointmentStatusError('OVERLAP'))
    expect(transaction.appointment.update).not.toHaveBeenCalled()
    expect(transaction.auditEvent.create).not.toHaveBeenCalled()
  })

  it('maps an exclusion-constraint race to a safe overlap error', async () => {
    const { database, transaction } = makeDatabase('NO_SHOW')
    transaction.appointment.update.mockRejectedValue(
      new Error('appointment_no_confirmed_overlap'),
    )

    await expect(
      changeAdminAppointmentStatusSerializable(
        database,
        'appointment-1',
        'CONFIRMED',
      ),
    ).rejects.toEqual(new AdminAppointmentStatusError('OVERLAP'))
    expect(transaction.auditEvent.create).not.toHaveBeenCalled()
  })

  it('rejects a stale transition before writing anything', async () => {
    const { database, transaction } = makeDatabase('NO_SHOW')

    await expect(
      changeAdminAppointmentStatusSerializable(
        database,
        'appointment-1',
        'COMPLETED',
      ),
    ).rejects.toEqual(new AdminAppointmentStatusError('INVALID_TRANSITION'))
    expect(transaction.appointment.update).not.toHaveBeenCalled()
    expect(transaction.auditEvent.create).not.toHaveBeenCalled()
  })
})
