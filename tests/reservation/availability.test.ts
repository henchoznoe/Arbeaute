import { describe, expect, it, vi } from 'vitest'
import { getAvailableSlots } from '@/lib/reservation/availability'
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
