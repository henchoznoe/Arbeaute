import { describe, expect, it } from 'vitest'
import {
  clampDateKey,
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

describe('clampDateKey', () => {
  const minDate = '2026-08-20'
  const maxDate = '2026-11-12'

  it('garde la semaine du rendez-vous quand elle est réservable', () => {
    // Le cas visé : un rendez-vous dans trois semaines ouvrait le calendrier
    // sur la première date réservable, et il fallait parcourir trois semaines
    // à la main pour retrouver le sien.
    expect(clampDateKey('2026-09-09', minDate, maxDate)).toBe('2026-09-09')
  })

  it('remonte à la première date réservable pour un rendez-vous très proche', () => {
    expect(clampDateKey('2026-08-19', minDate, maxDate)).toBe(minDate)
  })

  it('redescend à la dernière semaine complète pour un rendez-vous lointain', () => {
    expect(clampDateKey('2026-12-25', minDate, maxDate)).toBe(maxDate)
  })

  it('accepte les bornes elles-mêmes', () => {
    expect(clampDateKey(minDate, minDate, maxDate)).toBe(minDate)
    expect(clampDateKey(maxDate, minDate, maxDate)).toBe(maxDate)
  })
})
