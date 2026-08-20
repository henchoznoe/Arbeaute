import { describe, expect, it } from 'vitest'
import type { DayAvailability } from '@/lib/reservation/availability'
import {
  hasCompleteWeek,
  mergeAvailability,
  weekDateKeys,
} from '@/lib/reservation/week-cache'

const day = (slots: string[] = []): DayAvailability => ({
  state: slots.length > 0 ? 'AVAILABLE' : 'CLOSED',
  slots: slots.map(startsAt => ({
    startsAt,
    label: startsAt.slice(11, 16),
    state: 'OPEN' as const,
  })),
})

const week = (viewStart: string): Record<string, DayAvailability> =>
  Object.fromEntries(weekDateKeys(viewStart).map(dateKey => [dateKey, day()]))

describe('weekDateKeys', () => {
  it('donne les sept jours à partir du premier', () => {
    expect(weekDateKeys('2026-08-17')).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ])
  })

  it('franchit un changement de mois', () => {
    expect(weekDateKeys('2026-08-31').at(-1)).toBe('2026-09-06')
  })
})

describe('hasCompleteWeek', () => {
  it('reconnaît une semaine entièrement chargée', () => {
    expect(hasCompleteWeek(week('2026-08-17'), '2026-08-17')).toBe(true)
  })

  it('refuse une semaine à laquelle il manque un jour', () => {
    // Six jours et une case vide serait pire que d'attendre.
    const partial = week('2026-08-17')
    delete partial['2026-08-20']

    expect(hasCompleteWeek(partial, '2026-08-17')).toBe(false)
  })

  it('reconnaît les trois semaines d’une fenêtre chargée d’un coup', () => {
    // Le serveur renvoie la semaine affichée plus ses deux voisines : les
    // flèches doivent donc trouver leur semaine déjà présente.
    const window = mergeAvailability(
      mergeAvailability(week('2026-08-10'), week('2026-08-17')),
      week('2026-08-24'),
    )

    expect(hasCompleteWeek(window, '2026-08-10')).toBe(true)
    expect(hasCompleteWeek(window, '2026-08-17')).toBe(true)
    expect(hasCompleteWeek(window, '2026-08-24')).toBe(true)
    expect(hasCompleteWeek(window, '2026-08-31')).toBe(false)
  })
})

describe('mergeAvailability', () => {
  it('garde ce qui était connu et ajoute ce qui arrive', () => {
    const merged = mergeAvailability(
      { '2026-08-17': day(['2026-08-17T08:00:00.000Z']) },
      { '2026-08-18': day() },
    )

    expect(Object.keys(merged).sort()).toEqual(['2026-08-17', '2026-08-18'])
  })

  it('laisse la réponse la plus récente écraser l’ancienne', () => {
    // Un créneau pris entre-temps doit disparaître : une réponse plus récente
    // dit toujours mieux ce qui est encore libre.
    const merged = mergeAvailability(
      { '2026-08-17': day(['2026-08-17T08:00:00.000Z']) },
      { '2026-08-17': day() },
    )

    expect(merged['2026-08-17'].slots).toHaveLength(0)
  })
})
