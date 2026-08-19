import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  describeExceptionDay,
  getExceptionCountNoun,
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

/**
 * Dans une pastille de 27 px, « 1 ouv. » et « 1 ferm. » s'affichaient tous deux
 * « 1 … » : il ne restait que la couleur pour dire si le jour ajoutait des
 * heures ou en retirait. Une ouverture exceptionnelle et des vacances sont
 * pourtant l'inverse l'une de l'autre.
 */
describe('jours particuliers', () => {
  const CALENDAR = readFileSync(
    'components/admin/availability-exception-calendar.tsx',
    'utf8',
  )

  it('accorde le nom au nombre', () => {
    expect(getExceptionCountNoun(1, 'AVAILABLE')).toBe('ouverture')
    expect(getExceptionCountNoun(2, 'AVAILABLE')).toBe('ouvertures')
    expect(getExceptionCountNoun(1, 'UNAVAILABLE')).toBe('fermeture')
    expect(getExceptionCountNoun(3, 'UNAVAILABLE')).toBe('fermetures')
  })

  it('annonce le contenu complet de la cellule', () => {
    expect(describeExceptionDay('17 août 2026', 0, 0)).toBe('17 août 2026')
    expect(describeExceptionDay('17 août 2026', 1, 0)).toBe(
      '17 août 2026, 1 ouverture',
    )
    expect(describeExceptionDay('17 août 2026', 2, 3)).toBe(
      '17 août 2026, 2 ouvertures, 3 fermetures',
    )
  })

  it('distingue les deux natures par une icône, sans couper de mot', () => {
    expect(CALENDAR).toContain('describeExceptionDay(')
    expect(CALENDAR).not.toContain('ouv.')
    expect(CALENDAR).not.toContain('ferm.')
    // `truncate` sur la pastille était la cause de « 1 … » : le nom se cache
    // désormais tant que la place manque, au lieu de se couper.
    expect(CALENDAR).not.toContain('truncate rounded bg-success-soft')
    expect(CALENDAR).toContain('hidden lg:inline')
  })
})
