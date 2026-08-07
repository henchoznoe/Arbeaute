import { describe, expect, it } from 'vitest'
import {
  buildAvailabilityExceptionRows,
  isInsidePublicOpening,
  mergeIntervals,
} from '@/lib/admin/agenda'

const interval = (start: string, end: string) => ({
  start: new Date(start),
  end: new Date(end),
})

describe('admin agenda public-hours warning', () => {
  it('accepts an appointment fully contained in a weekly opening', () => {
    expect(
      isInsidePublicOpening({
        occupied: interval('2026-08-10T06:30:00Z', '2026-08-10T07:30:00Z'),
        weekly: [interval('2026-08-10T06:00:00Z', '2026-08-10T09:30:00Z')],
        available: [],
        unavailable: [],
      }),
    ).toBe(true)
  })

  it('accepts an exceptional opening outside the weekly schedule', () => {
    expect(
      isInsidePublicOpening({
        occupied: interval('2026-08-13T08:00:00Z', '2026-08-13T09:00:00Z'),
        weekly: [],
        available: [interval('2026-08-13T07:00:00Z', '2026-08-13T10:00:00Z')],
        unavailable: [],
      }),
    ).toBe(true)
  })

  it('warns when an unavailability intersects preparation or cleanup', () => {
    expect(
      isInsidePublicOpening({
        occupied: interval('2026-08-10T06:45:00Z', '2026-08-10T08:00:00Z'),
        weekly: [interval('2026-08-10T06:00:00Z', '2026-08-10T09:30:00Z')],
        available: [],
        unavailable: [interval('2026-08-10T07:55:00Z', '2026-08-10T08:30:00Z')],
      }),
    ).toBe(false)
  })

  it('warns when the appointment crosses the midday break', () => {
    expect(
      isInsidePublicOpening({
        occupied: interval('2026-08-10T09:00:00Z', '2026-08-10T12:00:00Z'),
        weekly: [
          interval('2026-08-10T06:00:00Z', '2026-08-10T09:30:00Z'),
          interval('2026-08-10T11:30:00Z', '2026-08-10T16:30:00Z'),
        ],
        available: [],
        unavailable: [],
      }),
    ).toBe(false)
  })

  it('merges adjacent openings without mutating their input', () => {
    const first = interval('2026-08-10T06:00:00Z', '2026-08-10T08:00:00Z')
    const merged = mergeIntervals([
      first,
      interval('2026-08-10T08:00:00Z', '2026-08-10T09:00:00Z'),
    ])
    expect(merged).toEqual([
      interval('2026-08-10T06:00:00Z', '2026-08-10T09:00:00Z'),
    ])
    expect(first.end.toISOString()).toBe('2026-08-10T08:00:00.000Z')
  })
})

describe('multi-day availability exceptions', () => {
  it('repeats the same daily time range across a date span', () => {
    const rows = buildAvailabilityExceptionRows({
      type: 'UNAVAILABLE',
      startDateKey: '2026-08-20',
      endDateKey: '2026-08-22',
      startMinute: 8 * 60,
      endMinute: 18 * 60,
      label: 'Vacances',
    })
    expect(rows).toHaveLength(3)
    expect(rows.map(row => row.startsAt.toISOString())).toEqual([
      '2026-08-20T06:00:00.000Z',
      '2026-08-21T06:00:00.000Z',
      '2026-08-22T06:00:00.000Z',
    ])
    expect(rows.map(row => row.endsAt.toISOString())).toEqual([
      '2026-08-20T16:00:00.000Z',
      '2026-08-21T16:00:00.000Z',
      '2026-08-22T16:00:00.000Z',
    ])
    expect(rows.every(row => row.type === 'UNAVAILABLE')).toBe(true)
    expect(rows.every(row => row.label === 'Vacances')).toBe(true)
  })

  it('produces a single row when start and end date are the same', () => {
    const rows = buildAvailabilityExceptionRows({
      type: 'AVAILABLE',
      startDateKey: '2026-08-20',
      endDateKey: '2026-08-20',
      startMinute: 8 * 60,
      endMinute: 12 * 60,
      label: null,
    })
    expect(rows).toHaveLength(1)
  })

  it('rejects an end date before the start date', () => {
    expect(() =>
      buildAvailabilityExceptionRows({
        type: 'UNAVAILABLE',
        startDateKey: '2026-08-22',
        endDateKey: '2026-08-20',
        startMinute: 8 * 60,
        endMinute: 18 * 60,
        label: null,
      }),
    ).toThrow()
  })
})
