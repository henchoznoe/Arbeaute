import { describe, expect, it } from 'vitest'
import {
  addLocalDays,
  canCustomerChangeAppointment,
  getCustomerChangeDeadline,
  getDateKeysInRange,
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

  it('skips the weekend when counting the 48 business hours', () => {
    // Lundi 10 août 2026, 10:00 à Zurich (08:00 UTC).
    const startsAt = new Date('2026-08-10T08:00:00.000Z')
    // 10 h le lundi + 24 h le vendredi + 14 h le jeudi = 48 h ouvrables,
    // samedi et dimanche ne comptant pas.
    expect(getCustomerChangeDeadline(startsAt).toISOString()).toBe(
      '2026-08-06T08:00:00.000Z',
    )
  })

  it('allows a change until the deadline, but not one millisecond later', () => {
    const startsAt = new Date('2026-08-10T08:00:00.000Z')
    expect(
      canCustomerChangeAppointment(
        startsAt,
        new Date('2026-08-06T07:59:59.999Z'),
      ),
    ).toBe(true)
    expect(
      canCustomerChangeAppointment(
        startsAt,
        new Date('2026-08-06T08:00:00.000Z'),
      ),
    ).toBe(false)
  })

  it('does not count Saturday or Sunday as business time', () => {
    // Mercredi 12 août 2026, 10:00 à Zurich : aucun week-end sur les 48 h.
    const midweek = new Date('2026-08-12T08:00:00.000Z')
    expect(getCustomerChangeDeadline(midweek).toISOString()).toBe(
      '2026-08-10T08:00:00.000Z',
    )
  })

  it('lists every date in an inclusive range, single day included', () => {
    expect(getDateKeysInRange('2026-08-20', '2026-08-20')).toEqual([
      '2026-08-20',
    ])
    expect(getDateKeysInRange('2026-08-20', '2026-08-23')).toEqual([
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ])
  })

  it('crosses a month boundary when listing a date range', () => {
    expect(getDateKeysInRange('2026-08-30', '2026-09-02')).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
    ])
  })

  it('rejects an inverted or invalid date range', () => {
    expect(() => getDateKeysInRange('2026-08-23', '2026-08-20')).toThrow()
    expect(() => getDateKeysInRange('2026-02-30', '2026-08-20')).toThrow()
  })

  it('keeps a Monday appointment cancellable during the previous week', () => {
    const startsAt = new Date('2026-08-10T08:00:00.000Z')
    // Le samedi précédent, le délai n'est pas encore écoulé côté calendaire,
    // mais il l'est déjà en heures ouvrables.
    expect(
      canCustomerChangeAppointment(
        startsAt,
        new Date('2026-08-08T10:00:00.000Z'),
      ),
    ).toBe(false)
  })
})
