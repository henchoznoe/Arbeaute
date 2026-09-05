import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  rankRescheduleSlots,
  rescheduleAdminAppointment,
} from '@/lib/admin/reschedule'
import { getAdminRescheduleSlots } from '@/lib/reservation/availability'
import { Prisma } from '@/prisma/generated/prisma/client'

const current = {
  id: 'rdv',
  serviceId: 'old-service',
  startsAt: new Date('2026-09-07T08:00Z'),
  endsAt: new Date('2026-09-07T08:30Z'),
  serviceDurationMinutes: 30,
  preparationMinutes: 15,
  cleanupMinutes: 15,
  servicePriceCents: 5500,
  serviceNameSnapshot: 'Soin réservé',
  status: 'CONFIRMED',
  service: { category: { name: 'Visage' } },
  customerEmail: null,
}
const now = new Date('2026-09-07T06:00Z')
const input = {
  appointmentId: 'rdv',
  expectedStartsAt: current.startsAt,
  startsAt: new Date('2026-09-07T09:00Z'),
}
const makeDatabase = () => {
  const transaction = {
    appointment: {
      findUnique: vi.fn().mockResolvedValue(current),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...current, ...data }),
        ),
    },
    service: { findFirst: vi.fn().mockResolvedValue({ durationMinutes: 120 }) },
    weeklyAvailability: {
      findMany: vi
        .fn()
        .mockResolvedValue([
          { dayOfWeek: 1, startMinute: 480, endMinute: 720 },
        ]),
    },
    availabilityException: { findMany: vi.fn().mockResolvedValue([]) },
    auditEvent: { create: vi.fn().mockResolvedValue({}) },
  }
  return {
    ...transaction,
    $transaction: vi.fn(callback => callback(transaction)),
  }
}

describe('déplacement guidé', () => {
  beforeEach(() => vi.clearAllMocks())
  it('utilise la durée réservée, les buffers et le quart d’heure sans consulter le catalogue', async () => {
    const database = makeDatabase()
    const slots = await getAdminRescheduleSlots({
      database: database as never,
      appointment: current,
      fromDateKey: '2026-09-07',
      toDateKey: '2026-09-13',
      now,
    })
    expect(database.service.findFirst).not.toHaveBeenCalled()
    expect(database.appointment.findMany).toHaveBeenCalledTimes(1)
    expect(database.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: 'rdv' } }),
      }),
    )
    expect(slots[0].label).toBe('08:15')
    expect(slots.at(-1)?.label).toBe('11:15')
    expect(slots.every(slot => slot.state === 'OPEN')).toBe(true)
  })
  it('propose aussi les heures au-delà de l’horizon public', async () => {
    const database = makeDatabase()
    expect(
      await getAdminRescheduleSlots({
        database: database as never,
        appointment: current,
        fromDateKey: '2028-01-03',
        toDateKey: '2028-01-09',
        now,
      }),
    ).not.toHaveLength(0)
  })
  it('enregistre uniquement l’heure et ses bornes et laisse les coordonnées et le prix intacts', async () => {
    const database = makeDatabase()
    const result = await rescheduleAdminAppointment(
      database as never,
      input,
      now,
    )
    expect(result.appointment.servicePriceCents).toBe(5500)
    expect(database.appointment.update).toHaveBeenCalledWith({
      where: { id: 'rdv' },
      data: {
        startsAt: input.startsAt,
        endsAt: new Date('2026-09-07T09:30Z'),
        occupiedStartsAt: new Date('2026-09-07T08:45Z'),
        occupiedEndsAt: new Date('2026-09-07T09:45Z'),
        allowsOverlap: false,
      },
    })
    expect(database.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
    expect(database.auditEvent.create).toHaveBeenCalledTimes(1)
  })
  it('refuse un changement concurrent et un rendez-vous annulé', async () => {
    for (const changed of [
      { ...current, startsAt: new Date('2026-09-07T07:00Z') },
      { ...current, status: 'CANCELLED' },
    ]) {
      const database = makeDatabase()
      database.appointment.findUnique.mockResolvedValue(changed)
      await expect(
        rescheduleAdminAppointment(database as never, input, now),
      ).rejects.toMatchObject({ code: 'CHANGED' })
      expect(database.appointment.update).not.toHaveBeenCalled()
    }
  })
  it('refuse une heure occupée, fermée ou passée', async () => {
    const database = makeDatabase()
    database.appointment.findMany.mockResolvedValue([
      {
        startsAt: input.startsAt,
        endsAt: new Date('2026-09-07T10:00Z'),
        preparationMinutes: 0,
        cleanupMinutes: 0,
      },
    ] as never)
    await expect(
      rescheduleAdminAppointment(database as never, input, now),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    database.appointment.findMany.mockResolvedValue([])
    database.availabilityException.findMany.mockResolvedValue([
      {
        type: 'UNAVAILABLE',
        startsAt: new Date('2026-09-07T00:00Z'),
        endsAt: new Date('2026-09-08T00:00Z'),
      },
    ] as never)
    await expect(
      rescheduleAdminAppointment(database as never, input, now),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    await expect(
      rescheduleAdminAppointment(
        database as never,
        { ...input, startsAt: now },
        now,
      ),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect(database.appointment.update).not.toHaveBeenCalled()
  })
  it('recommence après une collision sérialisable sans répéter l’écriture finale', async () => {
    const database = makeDatabase()
    database.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('concurrent', {
        code: 'P2034',
        clientVersion: 'test',
      }),
    )
    await rescheduleAdminAppointment(database as never, input, now)
    expect(database.$transaction).toHaveBeenCalledTimes(2)
    expect(database.auditEvent.create).toHaveBeenCalledTimes(1)
  })
  it('classe les heures proches du même jour avant les jours suivants', () => {
    const slots = [
      '2026-09-08T06:00Z',
      '2026-09-07T07:00Z',
      '2026-09-07T08:15Z',
      '2026-09-07T08:00Z',
    ].map(startsAt => ({ startsAt, label: '', state: 'OPEN' as const }))
    expect(
      rankRescheduleSlots(slots, current.startsAt).map(s => s.startsAt),
    ).toEqual(['2026-09-07T08:15Z', '2026-09-07T07:00Z', '2026-09-08T06:00Z'])
  })
})
