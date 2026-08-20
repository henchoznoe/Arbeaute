import { describe, expect, it } from 'vitest'
import {
  buildWeeklySummary,
  formatWorkedDuration,
  type WeeklySummaryAppointment,
} from '@/lib/email/weekly-summary'

const now = new Date('2026-08-16T20:00:00.000Z')

const appointment = (
  overrides: Partial<WeeklySummaryAppointment> = {},
): WeeklySummaryAppointment => ({
  startsAt: new Date('2026-08-11T08:00:00.000Z'),
  endsAt: new Date('2026-08-11T09:00:00.000Z'),
  serviceDurationMinutes: 60,
  servicePriceCents: 12_000,
  serviceNameSnapshot: 'Soin visage bio',
  categoryName: 'Soins visage',
  status: 'CONFIRMED',
  ...overrides,
})

describe('buildWeeklySummary', () => {
  it('compte comme réalisé un rendez-vous confirmé dont l’heure est passée', () => {
    // C'est la règle du projet depuis la v2 : plus rien n'écrit COMPLETED.
    const summary = buildWeeklySummary([appointment(), appointment()], now)

    expect(summary.visitCount).toBe(2)
    expect(summary.workedMinutes).toBe(120)
    expect(summary.revenueCents).toBe(24_000)
  })

  it('ignore ce qui n’a pas encore eu lieu', () => {
    const summary = buildWeeklySummary(
      [
        appointment(),
        appointment({
          startsAt: new Date('2026-08-16T21:00:00.000Z'),
          endsAt: new Date('2026-08-16T22:00:00.000Z'),
        }),
      ],
      now,
    )

    expect(summary.visitCount).toBe(1)
    expect(summary.revenueCents).toBe(12_000)
  })

  it('ne compte ni les absences ni les annulations dans le montant', () => {
    const summary = buildWeeklySummary(
      [
        appointment(),
        appointment({ status: 'NO_SHOW' }),
        appointment({ status: 'CANCELLED' }),
      ],
      now,
    )

    expect(summary.visitCount).toBe(1)
    expect(summary.revenueCents).toBe(12_000)
    expect(summary.noShowCount).toBe(1)
  })

  it('désigne le soin le plus donné, et tranche les égalités sans hésiter', () => {
    const summary = buildWeeklySummary(
      [
        appointment({
          serviceNameSnapshot: 'Sourcils',
          categoryName: 'Épilation au fil',
        }),
        appointment(),
      ],
      now,
    )

    // À égalité, l'ordre alphabétique : un bilan ne change pas d'avis d'une
    // lecture à l'autre.
    expect(summary.topServiceLabel).toBe('Épilation au fil — Sourcils')
  })

  it('ne confond pas deux prestations de même nom dans des groupes différents', () => {
    // Le catalogue propose « Visage » en Laser Erbium, en Endosphères et en
    // épilation laser. Agréger sur le nom seul additionnait les trois : le
    // classement lui-même était faux, pas seulement son libellé.
    const summary = buildWeeklySummary(
      [
        appointment({
          serviceNameSnapshot: 'Visage',
          categoryName: 'Laser Erbium',
        }),
        appointment({
          serviceNameSnapshot: 'Visage',
          categoryName: 'Endosphères Therapy',
        }),
        appointment(),
        appointment(),
      ],
      now,
    )

    expect(summary.topServiceLabel).toBe('Soins visage — Soin visage bio')
  })

  it('se contente du nom quand la prestation n’a plus de groupe', () => {
    const summary = buildWeeklySummary(
      [appointment({ categoryName: null })],
      now,
    )

    expect(summary.topServiceLabel).toBe('Soin visage bio')
  })

  it('reste calme sur une semaine vide', () => {
    const summary = buildWeeklySummary([], now)

    expect(summary).toEqual({
      visitCount: 0,
      workedMinutes: 0,
      revenueCents: 0,
      noShowCount: 0,
      topServiceLabel: null,
    })
  })
})

describe('formatWorkedDuration', () => {
  it('écrit des heures, jamais un total de minutes', () => {
    expect(formatWorkedDuration(45)).toBe('45 min')
    expect(formatWorkedDuration(120)).toBe('2 h')
    expect(formatWorkedDuration(390)).toBe('6 h 30')
    expect(formatWorkedDuration(65)).toBe('1 h 05')
  })
})
