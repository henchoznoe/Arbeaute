import { describe, expect, it } from 'vitest'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import {
  formatAppointmentDate,
  formatCompactMoment,
  formatLongDate,
  formatSlotTime,
} from '@/lib/reservation/time'
import { capitalizeFirst, formatPrice } from '@/lib/utils/format'

/**
 * Garde-fous de l'élément 13 : une même donnée ne doit pas s'écrire de deux
 * façons selon l'écran. Ces tests remplacent la couverture perdue avec la
 * recette de bout en bout, sans base de données ni navigateur.
 */

// 17 août 2026, 14:00 à Bulle (12:00 UTC, heure d'été).
const moment = new Date('2026-08-17T12:00:00.000Z')

describe('formatage des dates', () => {
  it('écrit la date longue à la française, sans virgule après le jour', () => {
    expect(formatLongDate(moment)).toBe('lundi 17 août 2026')
  })

  it('sépare l’heure par « à », jamais par une virgule', () => {
    expect(formatAppointmentDate(moment)).toBe('lundi 17 août 2026 à 14:00')
    expect(formatCompactMoment(moment)).toBe('lun. 17 août 2026 à 14:00')
  })

  it('reste ancré sur le fuseau de l’institut, pas sur celui du visiteur', () => {
    // Minuit UTC le 1er janvier, c'est encore 2025 à Bulle : 01:00 le 1er.
    const newYear = new Date('2026-01-01T00:00:00.000Z')
    expect(formatAppointmentDate(newYear)).toBe('jeudi 1 janvier 2026 à 01:00')
    expect(formatSlotTime(newYear)).toBe('01:00')
  })

  it('suit l’heure d’hiver comme l’heure d’été', () => {
    const winter = new Date('2026-01-15T12:00:00.000Z')
    expect(formatAppointmentDate(winter)).toBe('jeudi 15 janvier 2026 à 13:00')
    expect(formatAppointmentDate(moment)).toContain('à 14:00')
  })
})

describe('capitalizeFirst', () => {
  it('ne met une majuscule qu’à la première lettre', () => {
    expect(capitalizeFirst('lundi 17 août 2026')).toBe('Lundi 17 août 2026')
    expect(capitalizeFirst('créneau à choisir')).toBe('Créneau à choisir')
  })

  it('gère les accents et les chaînes qui ne commencent pas par une lettre', () => {
    expect(capitalizeFirst('épilation au fil')).toBe('Épilation au fil')
    expect(capitalizeFirst('17 août')).toBe('17 août')
    expect(capitalizeFirst('')).toBe('')
  })
})

/** `Intl` sépare le montant du sigle par une espace insécable. */
const plainSpaces = (value: string): string => value.replace(/\u00a0/g, ' ')

describe('formatPrice', () => {
  it('affiche un prix entier sans décimale superflue', () => {
    expect(plainSpaces(formatPrice(3000))).toBe('30 CHF')
    expect(plainSpaces(formatPrice(0))).toBe('0 CHF')
  })

  it('sépare les milliers par l’apostrophe suisse', () => {
    expect(plainSpaces(formatPrice(125_000))).toBe("1'250 CHF")
  })

  /**
   * Régression : le formateur numérique `fr-CH` écrivait « 75,5 CHF » — une
   * virgule décimale et une décimale manquante, pour une somme d'argent.
   */
  it('écrit les centimes avec un point et deux chiffres', () => {
    expect(plainSpaces(formatPrice(7550))).toBe('75.50 CHF')
    expect(plainSpaces(formatPrice(3005))).toBe('30.05 CHF')
  })
})

describe('formatServiceLabel', () => {
  it('préfixe par le groupe, deux prestations pouvant porter le même nom', () => {
    expect(formatServiceLabel('Visage', 'Laser Erbium')).toBe(
      'Laser Erbium — Visage',
    )
  })

  it('se contente du nom quand le groupe manque', () => {
    expect(formatServiceLabel('Visage')).toBe('Visage')
    expect(formatServiceLabel('Visage', null)).toBe('Visage')
  })
})
