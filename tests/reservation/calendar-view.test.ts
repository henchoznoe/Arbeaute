import { describe, expect, it } from 'vitest'
import {
  formatCalendarDate,
  formatCalendarPeriod,
  formatCalendarWeekday,
} from '@/lib/reservation/calendar-view'

describe('libellés du calendrier', () => {
  it('formate une période compacte dans le même mois', () => {
    expect(formatCalendarPeriod('2026-08-10', '2026-08-16')).toBe(
      '10–16 août 2026',
    )
  })

  it('conserve les deux mois quand la semaine les traverse', () => {
    expect(formatCalendarPeriod('2026-08-31', '2026-09-06')).toBe(
      '31 août – 6 septembre 2026',
    )
  })

  it('fournit un libellé de jour court et un libellé accessible complet', () => {
    expect(formatCalendarWeekday('2026-08-10')).toBe('lun')
    expect(formatCalendarDate('2026-08-10')).toBe('lundi 10 août 2026')
  })
})
