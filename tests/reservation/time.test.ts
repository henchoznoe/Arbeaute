import { describe, expect, it } from 'vitest'
import {
  addLocalDays,
  canCustomerChangeAppointment,
  getLocalDayBounds,
  getLocalDayOfWeek,
  getLocalWeekDateKeys,
  isDateKey,
  localDateMinuteToUtc,
} from '@/lib/reservation/time'

describe('Europe/Zurich date conversion', () => {
  it('uses the correct summer and winter offsets', () => {
    expect(localDateMinuteToUtc('2026-08-10', 8 * 60).toISOString()).toBe(
      '2026-08-10T06:00:00.000Z',
    )
    expect(localDateMinuteToUtc('2026-12-07', 8 * 60).toISOString()).toBe(
      '2026-12-07T07:00:00.000Z',
    )
  })

  it('keeps local day bounds correct across daylight-saving changes', () => {
    const spring = getLocalDayBounds('2026-03-29')
    const autumn = getLocalDayBounds('2026-10-25')
    expect(spring.end.getTime() - spring.start.getTime()).toBe(
      23 * 60 * 60 * 1000,
    )
    expect(autumn.end.getTime() - autumn.start.getTime()).toBe(
      25 * 60 * 60 * 1000,
    )
  })

  it('validates calendar dates and weekdays without server timezone leakage', () => {
    expect(isDateKey('2026-02-29')).toBe(false)
    expect(isDateKey('2028-02-29')).toBe(true)
    expect(getLocalDayOfWeek('2026-08-10')).toBe(1)
    expect(addLocalDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(getLocalWeekDateKeys('2026-08-09')).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
    ])
  })

  it('allows changes exactly 24 hours before, but not one millisecond later', () => {
    const startsAt = new Date('2026-08-10T08:00:00.000Z')
    expect(
      canCustomerChangeAppointment(
        startsAt,
        new Date('2026-08-09T08:00:00.000Z'),
      ),
    ).toBe(true)
    expect(
      canCustomerChangeAppointment(
        startsAt,
        new Date('2026-08-09T08:00:00.001Z'),
      ),
    ).toBe(false)
  })
})
