import { describe, expect, it } from 'vitest'
import {
  getMonthCalendarDateKeys,
  groupAvailabilityExceptions,
  hasAvailabilityExceptionOverlap,
} from '@/lib/admin/availability-calendar'

describe('admin availability calendar', () => {
  it('builds a stable six-week grid starting on Monday', () => {
    const dates = getMonthCalendarDateKeys('2026-08')
    expect(dates).toHaveLength(42)
    expect(dates[0]).toBe('2026-07-27')
    expect(dates.at(-1)).toBe('2026-09-06')
  })

  it('groups daily rows from one input and labels full days explicitly', () => {
    const groups = groupAvailabilityExceptions([
      {
        id: 'first',
        groupId: 'vacances',
        type: 'UNAVAILABLE',
        startsAt: new Date('2026-08-20T22:00:00.000Z'),
        endsAt: new Date('2026-08-21T22:00:00.000Z'),
        label: 'Vacances',
      },
      {
        id: 'second',
        groupId: 'vacances',
        type: 'UNAVAILABLE',
        startsAt: new Date('2026-08-21T22:00:00.000Z'),
        endsAt: new Date('2026-08-22T22:00:00.000Z'),
        label: 'Vacances',
      },
    ])

    expect(groups).toEqual([
      {
        groupId: 'vacances',
        type: 'UNAVAILABLE',
        label: 'Vacances',
        from: '2026-08-21',
        to: '2026-08-22',
        dayCount: 2,
        rowCount: 2,
        timeLabels: ['Journée entière'],
      },
    ])
  })

  it('detects real overlaps but accepts adjacent ranges', () => {
    const existing = [
      {
        dateKey: '2026-08-20',
        startMinute: 8 * 60,
        endMinute: 12 * 60,
      },
    ]
    expect(
      hasAvailabilityExceptionOverlap(
        [
          {
            dateKey: '2026-08-20',
            startMinute: 11 * 60,
            endMinute: 13 * 60,
          },
        ],
        existing,
      ),
    ).toBe(true)
    expect(
      hasAvailabilityExceptionOverlap(
        [
          {
            dateKey: '2026-08-20',
            startMinute: 12 * 60,
            endMinute: 14 * 60,
          },
        ],
        existing,
      ),
    ).toBe(false)
  })
})
