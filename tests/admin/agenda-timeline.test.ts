import { describe, expect, it } from 'vitest'
import {
  assignTimelineLanes,
  buildAdminTimelineDay,
  formatTimelineMinute,
  getFreeTimelineStarts,
  getWeekTimelineBounds,
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
          customerId: null,
          serviceLabel: 'Soin visage',
          serviceColor: '#d99086',
          source: 'ADMIN',
          status: 'CONFIRMED',
        },
      ],
    })
    const freeStarts = getFreeTimelineStarts(day)

    expect(freeStarts).toContain(8 * 60)
    // Le quart d'heure qui précède l'installation reste proposé, la minute où
    // elle commence ne l'est plus.
    expect(freeStarts).toContain(9 * 60 + 30)
    expect(freeStarts).not.toContain(9 * 60 + 45)
    expect(freeStarts).not.toContain(10 * 60)
    expect(freeStarts).not.toContain(12 * 60)
    expect(freeStarts).toContain(13 * 60)
  })

  it('proposes a start every quarter of an hour', () => {
    const day = buildDay({
      weekly: [{ dayOfWeek: 1, startMinute: 8 * 60, endMinute: 9 * 60 }],
    })

    expect(getFreeTimelineStarts(day)).toEqual([
      8 * 60,
      8 * 60 + 15,
      8 * 60 + 30,
      8 * 60 + 45,
    ])
  })

  it('flags every appointment involved in a visual overlap', () => {
    const common = {
      preparationMinutes: 0,
      cleanupMinutes: 0,
      customerPhone: null,
      customerId: null,
      serviceLabel: 'Soin',
      serviceColor: '#d99086',
      source: 'PUBLIC' as const,
      status: 'CONFIRMED' as const,
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
          customerId: null,
          serviceLabel: 'Soin',
          serviceColor: '#d99086',
          source: 'PUBLIC',
          status: 'CONFIRMED',
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

  it('shows a completed appointment without keeping its slot occupied', () => {
    const day = buildDay({
      appointments: [
        {
          id: 'completed',
          startsAt: new Date('2026-08-10T08:00:00.000Z'),
          endsAt: new Date('2026-08-10T09:00:00.000Z'),
          occupiedStartsAt: new Date('2026-08-10T08:00:00.000Z'),
          occupiedEndsAt: new Date('2026-08-10T09:00:00.000Z'),
          preparationMinutes: 0,
          cleanupMinutes: 0,
          customerName: 'Cliente terminée',
          customerPhone: null,
          customerId: null,
          serviceLabel: 'Soin',
          serviceColor: '#d99086',
          source: 'PUBLIC',
          status: 'COMPLETED',
        },
      ],
    })

    expect(day.appointments[0]?.status).toBe('COMPLETED')
    expect(getFreeTimelineStarts(day)).toContain(10 * 60)
  })
})

describe('grille hebdomadaire de bureau', () => {
  const day = (
    startMinute: number,
    endMinute: number,
  ): Parameters<typeof getWeekTimelineBounds>[0][number] =>
    ({
      timelineStartMinute: startMinute,
      timelineEndMinute: endMinute,
    }) as Parameters<typeof getWeekTimelineBounds>[0][number]

  it('donne une échelle commune, même quand une journée est vide', () => {
    // Sans bornes communes, 10:00 ne serait pas à la même hauteur d'une
    // colonne à l'autre et la grille ne se lirait plus en travers.
    expect(
      getWeekTimelineBounds([
        day(8 * 60, 18 * 60),
        day(7 * 60, 12 * 60),
        day(9 * 60, 20 * 60),
      ]),
    ).toEqual({ startMinute: 7 * 60, endMinute: 20 * 60 })
  })

  it('retombe sur la journée par défaut quand rien n’est affiché', () => {
    expect(getWeekTimelineBounds([])).toEqual({
      startMinute: 8 * 60,
      endMinute: 18 * 60,
    })
  })

  it('laisse une colonne entière aux rendez-vous qui ne se croisent pas', () => {
    expect(
      assignTimelineLanes([
        { startMinute: 540, endMinute: 600 },
        { startMinute: 600, endMinute: 660 },
      ]),
    ).toEqual([
      { lane: 0, laneCount: 1 },
      { lane: 0, laneCount: 1 },
    ])
  })

  it('partage la largeur entre deux rendez-vous superposés', () => {
    expect(
      assignTimelineLanes([
        { startMinute: 540, endMinute: 660 },
        { startMinute: 600, endMinute: 720 },
      ]),
    ).toEqual([
      { lane: 0, laneCount: 2 },
      { lane: 1, laneCount: 2 },
    ])
  })

  it('donne la même largeur à toute une grappe de superpositions', () => {
    // Les trois se recouvrent de proche en proche : leur donner des largeurs
    // différentes désalignerait les blocs au sein d'une même tranche.
    const lanes = assignTimelineLanes([
      { startMinute: 540, endMinute: 660 },
      { startMinute: 570, endMinute: 690 },
      { startMinute: 600, endMinute: 720 },
    ])
    expect(lanes.map(entry => entry.lane)).toEqual([0, 1, 2])
    expect(lanes.every(entry => entry.laneCount === 3)).toBe(true)
  })

  it('rend son rang à un créneau libéré au sein d’une grappe', () => {
    // Le troisième commence après la fin du premier : il reprend sa colonne
    // plutôt que d'en ouvrir une nouvelle.
    const lanes = assignTimelineLanes([
      { startMinute: 540, endMinute: 600 },
      { startMinute: 570, endMinute: 720 },
      { startMinute: 600, endMinute: 660 },
    ])
    expect(lanes.map(entry => entry.lane)).toEqual([0, 1, 0])
    expect(lanes.every(entry => entry.laneCount === 2)).toBe(true)
  })

  it('conserve l’ordre d’entrée quel que soit l’ordre chronologique', () => {
    const lanes = assignTimelineLanes([
      { startMinute: 600, endMinute: 720 },
      { startMinute: 540, endMinute: 660 },
    ])
    expect(lanes).toEqual([
      { lane: 1, laneCount: 2 },
      { lane: 0, laneCount: 2 },
    ])
  })
})
