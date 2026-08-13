import { describe, expect, it } from 'vitest'
import {
  buildAdminTimelineDay,
  formatTimelineMinute,
  getFreeTimelineStarts,
  isAdminAppointmentTime,
} from '@/lib/admin/agenda-timeline'

const buildDay = (
  overrides: Partial<Parameters<typeof buildAdminTimelineDay>[0]> = {},
) =>
  buildAdminTimelineDay({
    dateKey: '2026-08-10',
    today: '2026-08-10',
    label: 'lundi 10 août',
    shortLabel: 'Lu',
    weekly: [{ dayOfWeek: 1, startMinute: 8 * 60, endMinute: 18 * 60 }],
    exceptions: [],
    appointments: [],
    ...overrides,
  })

describe('admin daily timeline', () => {
  it('selects today and merges an exceptional opening in memory', () => {
    const day = buildDay({
      weekly: [{ dayOfWeek: 1, startMinute: 8 * 60, endMinute: 12 * 60 }],
      exceptions: [
        {
          id: 'opening',
          type: 'AVAILABLE',
          startsAt: new Date('2026-08-10T10:00:00.000Z'),
          endsAt: new Date('2026-08-10T14:00:00.000Z'),
          label: 'Après-midi',
        },
      ],
    })

    expect(day.isToday).toBe(true)
    expect(day.dayNumber).toBe('10')
    expect(day.openings).toEqual([{ startMinute: 480, endMinute: 960 }])
  })

  it('removes closures and occupied preparation from tappable free spaces', () => {
    const day = buildDay({
      exceptions: [
        {
          id: 'closure',
          type: 'UNAVAILABLE',
          startsAt: new Date('2026-08-10T10:00:00.000Z'),
          endsAt: new Date('2026-08-10T11:00:00.000Z'),
          label: 'Pause',
        },
      ],
      appointments: [
        {
          id: 'appointment',
          startsAt: new Date('2026-08-10T08:00:00.000Z'),
          endsAt: new Date('2026-08-10T09:00:00.000Z'),
          occupiedStartsAt: new Date('2026-08-10T07:45:00.000Z'),
          occupiedEndsAt: new Date('2026-08-10T09:15:00.000Z'),
          preparationMinutes: 15,
          cleanupMinutes: 15,
          customerName: 'Arzu Test',
          customerPhone: null,
          serviceLabel: 'Soin visage',
          serviceColor: '#d99086',
          source: 'ADMIN',
        },
      ],
    })
    const freeStarts = getFreeTimelineStarts(day)

    expect(freeStarts).toContain(8 * 60)
    expect(freeStarts).not.toContain(9 * 60 + 30)
    expect(freeStarts).not.toContain(12 * 60)
    expect(freeStarts).toContain(13 * 60)
  })

  it('flags every appointment involved in a visual overlap', () => {
    const common = {
      preparationMinutes: 0,
      cleanupMinutes: 0,
      customerPhone: null,
      serviceLabel: 'Soin',
      serviceColor: '#d99086',
      source: 'PUBLIC' as const,
    }
    const day = buildDay({
      appointments: [
        {
          ...common,
          id: 'first',
          startsAt: new Date('2026-08-10T08:00:00.000Z'),
          endsAt: new Date('2026-08-10T09:00:00.000Z'),
          occupiedStartsAt: new Date('2026-08-10T08:00:00.000Z'),
          occupiedEndsAt: new Date('2026-08-10T09:00:00.000Z'),
          customerName: 'Première cliente',
        },
        {
          ...common,
          id: 'second',
          startsAt: new Date('2026-08-10T08:45:00.000Z'),
          endsAt: new Date('2026-08-10T09:30:00.000Z'),
          occupiedStartsAt: new Date('2026-08-10T08:45:00.000Z'),
          occupiedEndsAt: new Date('2026-08-10T09:30:00.000Z'),
          customerName: 'Deuxième cliente',
        },
      ],
    })

    expect(
      day.appointments.map(appointment => appointment.hasVisualOverlap),
    ).toEqual([true, true])
  })

  it('clips preparation spilling from the previous day', () => {
    const day = buildDay({
      weekly: [],
      appointments: [
        {
          id: 'night',
          startsAt: new Date('2026-08-09T22:15:00.000Z'),
          endsAt: new Date('2026-08-09T23:00:00.000Z'),
          occupiedStartsAt: new Date('2026-08-09T21:45:00.000Z'),
          occupiedEndsAt: new Date('2026-08-09T23:15:00.000Z'),
          preparationMinutes: 30,
          cleanupMinutes: 15,
          customerName: 'Cliente tardive',
          customerPhone: null,
          serviceLabel: 'Soin',
          serviceColor: '#d99086',
          source: 'PUBLIC',
        },
      ],
    })

    expect(day.appointments[0].occupiedStartMinute).toBe(0)
    expect(day.appointments[0].occupiedEndMinute).toBe(75)
    expect(day.timelineStartMinute).toBe(0)
  })

  it('formats and validates quarter-hour query values', () => {
    expect(formatTimelineMinute(9 * 60 + 30)).toBe('09:30')
    expect(isAdminAppointmentTime('09:30')).toBe(true)
    expect(isAdminAppointmentTime('09:07')).toBe(false)
    expect(isAdminAppointmentTime('24:00')).toBe(false)
  })
})
