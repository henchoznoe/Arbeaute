import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { AvailabilityDayState } from '@/lib/reservation/availability'
import {
  availabilityShortStateLabels,
  availabilityStateLabels,
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

/**
 * Cinq pastilles sur sept débordaient leur boîte à 375 px : on lisait
 * « Comple » et « Fermé— ». Une coupure au milieu d'un mot ne se lit pas comme
 * une abréviation, et la couleur restait seule à porter l'information — ce que
 * la première règle de `docs/systeme-visuel.md` interdit.
 */
describe('bande de sept jours', () => {
  const PICKER = readFileSync(
    'components/reservation/week-availability-picker.tsx',
    'utf8',
  )
  const states: AvailabilityDayState[] = [
    'AVAILABLE',
    'ON_REQUEST',
    'FULL',
    'CLOSED',
  ]

  it('donne à chaque état un nom complet et un nom court', () => {
    for (const state of states) {
      expect(availabilityStateLabels[state]).toBeTruthy()
      expect(availabilityShortStateLabels[state]).toBeTruthy()
      // Sept colonnes à 360 px : au-delà de huit signes, le mot ne tient plus
      // dans la pastille même à partir de `sm`.
      expect(availabilityShortStateLabels[state].length).toBeLessThanOrEqual(8)
    }
  })

  it('n’affiche le nom court qu’à partir de sm', () => {
    expect(PICKER).toContain('hidden sm:inline')
    expect(PICKER).not.toContain("? 'Libre'")
  })

  it('garde le nom complet dans l’aria-label et dans la légende', () => {
    expect(PICKER).toContain('availabilityStateLabels[state]')
    for (const state of states)
      expect(PICKER).toContain(availabilityStateLabels[state])
  })
})
