import { describe, expect, it, vi } from 'vitest'
import {
  findNextAvailableSlot,
  getAvailabilityByDate,
  getAvailableSlots,
  getAvailableSlotsByDate,
} from '@/lib/reservation/availability'
import { getDateKeysInRange } from '@/lib/reservation/time'
import type { Prisma } from '@/prisma/generated/prisma/client'

const makeDatabase = ({
  durationMinutes = 30,
  preparationMinutes = 0,
  cleanupMinutes = 0,
  weekly = [
    { dayOfWeek: 1, startMinute: 8 * 60, endMinute: 11 * 60 + 30 },
    { dayOfWeek: 1, startMinute: 13 * 60 + 30, endMinute: 18 * 60 + 30 },
  ],
  exceptions = [],
  appointments = [],
}: {
  durationMinutes?: number
  preparationMinutes?: number
  cleanupMinutes?: number
  weekly?: Array<{ dayOfWeek: number; startMinute: number; endMinute: number }>
  exceptions?: Array<{
    type: 'AVAILABLE' | 'UNAVAILABLE'
    startsAt: Date
    endsAt: Date
  }>
  appointments?: Array<{
    startsAt: Date
    endsAt: Date
    preparationMinutes: number
    cleanupMinutes: number
  }>
}) =>
  ({
    service: {
      findFirst: vi.fn().mockResolvedValue({
        durationMinutes,
        preparationMinutes,
        cleanupMinutes,
      }),
    },
    weeklyAvailability: { findMany: vi.fn().mockResolvedValue(weekly) },
    availabilityException: {
      findMany: vi.fn().mockResolvedValue(exceptions),
    },
    appointment: { findMany: vi.fn().mockResolvedValue(appointments) },
  }) as unknown as Prisma.TransactionClient

const monday = '2026-08-10'
const earlySunday = new Date('2026-08-09T00:00:00.000Z')

describe('public availability', () => {
  it('supports split schedules and quarter-hour starts', async () => {
    const slots = await getAvailableSlots({
      database: makeDatabase({ durationMinutes: 40 }),
      serviceId: 'service',
      dateKey: monday,
      now: earlySunday,
    })

    expect(slots.at(0)).toEqual({
      startsAt: '2026-08-10T06:00:00.000Z',
      label: '08:00',
    })
    expect(slots.some(slot => slot.label === '10:45')).toBe(true)
    expect(slots.some(slot => slot.label === '11:00')).toBe(false)
    expect(slots.some(slot => slot.label === '13:30')).toBe(true)
  })

  it.each([1, 10, 15, 40, 90, 120])(
    'keeps a %i-minute service inside the opening range',
    async durationMinutes => {
      const slots = await getAvailableSlots({
        database: makeDatabase({ durationMinutes }),
        serviceId: 'service',
        dateKey: monday,
        now: earlySunday,
      })
      expect(slots.length).toBeGreaterThan(0)
      expect(slots.every(slot => Number(slot.label.slice(3)) % 15 === 0)).toBe(
        true,
      )
    },
  )

  it('accounts for preparation, cleanup and existing appointments', async () => {
    const slots = await getAvailableSlots({
      database: makeDatabase({
        durationMinutes: 30,
        preparationMinutes: 15,
        cleanupMinutes: 15,
        appointments: [
          {
            startsAt: new Date('2026-08-10T06:30:00.000Z'),
            endsAt: new Date('2026-08-10T07:00:00.000Z'),
            preparationMinutes: 0,
            cleanupMinutes: 0,
          },
        ],
      }),
      serviceId: 'service',
      dateKey: monday,
      now: earlySunday,
    })

    expect(slots.some(slot => slot.label === '08:00')).toBe(false)
    expect(slots.some(slot => slot.label === '08:15')).toBe(false)
    expect(slots.some(slot => slot.label === '09:15')).toBe(true)
  })

  it('applies closures and exceptional openings', async () => {
    const closed = await getAvailableSlots({
      database: makeDatabase({
        exceptions: [
          {
            type: 'UNAVAILABLE',
            startsAt: new Date('2026-08-10T05:00:00.000Z'),
            endsAt: new Date('2026-08-10T17:00:00.000Z'),
          },
        ],
      }),
      serviceId: 'service',
      dateKey: monday,
      now: earlySunday,
    })
    expect(closed).toHaveLength(0)

    const sundayOpening = await getAvailableSlots({
      database: makeDatabase({
        weekly: [],
        exceptions: [
          {
            type: 'AVAILABLE',
            startsAt: new Date('2026-08-16T08:00:00.000Z'),
            endsAt: new Date('2026-08-16T10:00:00.000Z'),
          },
        ],
      }),
      serviceId: 'service',
      dateKey: '2026-08-16',
      now: earlySunday,
    })
    expect(sundayOpening.at(0)?.label).toBe('10:00')
  })

  it('enforces the 12-hour notice and three-month horizon', async () => {
    const tooSoon = await getAvailableSlots({
      database: makeDatabase({}),
      serviceId: 'service',
      dateKey: monday,
      now: new Date('2026-08-09T20:00:01.000Z'),
    })
    expect(tooSoon.some(slot => slot.label === '08:00')).toBe(false)

    const tooFar = await getAvailableSlots({
      database: makeDatabase({}),
      serviceId: 'service',
      dateKey: '2026-12-07',
      now: new Date('2026-08-06T08:00:00.000Z'),
    })
    expect(tooFar).toHaveLength(0)
  })
})

/**
 * Le calcul par plage doit rester strictement équivalent au calcul jour par
 * jour : c'est ce qui autorise à ne charger la base qu'une fois.
 */
describe('batched availability', () => {
  const sunday = '2026-08-16'
  const appointments = [
    {
      startsAt: new Date('2026-08-10T06:30:00.000Z'),
      endsAt: new Date('2026-08-10T07:00:00.000Z'),
      preparationMinutes: 15,
      cleanupMinutes: 15,
    },
  ]
  const exceptions = [
    {
      type: 'AVAILABLE' as const,
      startsAt: new Date('2026-08-16T08:00:00.000Z'),
      endsAt: new Date('2026-08-16T10:00:00.000Z'),
    },
  ]

  it('matches the day-by-day computation over a whole week', async () => {
    const options = { durationMinutes: 40, appointments, exceptions }
    const byDate = await getAvailableSlotsByDate({
      database: makeDatabase(options),
      serviceId: 'service',
      fromDateKey: monday,
      toDateKey: sunday,
      now: earlySunday,
    })

    for (const dateKey of getDateKeysInRange(monday, sunday)) {
      const single = await getAvailableSlots({
        database: makeDatabase(options),
        serviceId: 'service',
        dateKey,
        now: earlySunday,
      })
      expect(byDate[dateKey]).toEqual(single)
    }
  })

  it('loads the database once for the whole range', async () => {
    const database = makeDatabase({})
    await getAvailableSlotsByDate({
      database,
      serviceId: 'service',
      fromDateKey: monday,
      toDateKey: sunday,
      now: earlySunday,
    })

    expect(database.appointment.findMany).toHaveBeenCalledTimes(1)
    expect(database.weeklyAvailability.findMany).toHaveBeenCalledTimes(1)
    expect(database.availabilityException.findMany).toHaveBeenCalledTimes(1)
  })

  it('distinguishes available, full and closed days in one range', async () => {
    const availability = await getAvailabilityByDate({
      database: makeDatabase({
        weekly: [
          { dayOfWeek: 1, startMinute: 8 * 60, endMinute: 9 * 60 },
          { dayOfWeek: 2, startMinute: 8 * 60, endMinute: 9 * 60 },
          { dayOfWeek: 3, startMinute: 8 * 60, endMinute: 9 * 60 },
        ],
        appointments: [
          {
            startsAt: new Date('2026-08-11T06:00:00.000Z'),
            endsAt: new Date('2026-08-11T07:00:00.000Z'),
            preparationMinutes: 0,
            cleanupMinutes: 0,
          },
        ],
        exceptions: [
          {
            type: 'UNAVAILABLE',
            startsAt: new Date('2026-08-12T05:00:00.000Z'),
            endsAt: new Date('2026-08-12T18:00:00.000Z'),
          },
        ],
      }),
      serviceId: 'service',
      fromDateKey: monday,
      toDateKey: '2026-08-13',
      now: earlySunday,
    })

    expect(availability[monday]?.state).toBe('AVAILABLE')
    expect(availability['2026-08-11']).toEqual({ state: 'FULL', slots: [] })
    expect(availability['2026-08-12']).toEqual({
      state: 'CLOSED',
      slots: [],
    })
    expect(availability['2026-08-13']).toEqual({
      state: 'CLOSED',
      slots: [],
    })
  })

  it('loads each availability source once for calendar states', async () => {
    const database = makeDatabase({})
    await getAvailabilityByDate({
      database,
      serviceId: 'service',
      fromDateKey: monday,
      toDateKey: sunday,
      now: earlySunday,
    })

    expect(database.service.findFirst).toHaveBeenCalledTimes(1)
    expect(database.appointment.findMany).toHaveBeenCalledTimes(1)
    expect(database.weeklyAvailability.findMany).toHaveBeenCalledTimes(1)
    expect(database.availabilityException.findMany).toHaveBeenCalledTimes(1)
  })

  it('finds the next open day without querying per day', async () => {
    const database = makeDatabase({})
    const found = await findNextAvailableSlot({
      database,
      serviceId: 'service',
      fromDateKey: '2026-08-11',
      now: earlySunday,
    })

    expect(found?.dateKey).toBe('2026-08-17')
    expect(found?.slot.label).toBe('08:00')
    expect(database.appointment.findMany).toHaveBeenCalledTimes(1)
  })

  it('excludes the moved appointment while scanning the next slot', async () => {
    const database = makeDatabase({})
    await findNextAvailableSlot({
      database,
      serviceId: 'service',
      fromDateKey: '2026-08-11',
      now: earlySunday,
      excludeAppointmentId: 'current-appointment',
    })

    expect(database.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: 'current-appointment' },
        }),
      }),
    )
  })

  it('returns nothing when the service is not bookable', async () => {
    const database = {
      ...makeDatabase({}),
      service: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as Prisma.TransactionClient

    expect(
      await getAvailableSlotsByDate({
        database,
        serviceId: 'service',
        fromDateKey: monday,
        toDateKey: sunday,
        now: earlySunday,
      }),
    ).toEqual({})
  })
})
