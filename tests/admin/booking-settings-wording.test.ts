import { describe, expect, it } from 'vitest'
import {
  describeBookingHorizon,
  describeBookingNotice,
  describeLateRequestFloor,
  describeLateRequests,
  describeSlotInterval,
  formatSlotIntervalLabel,
} from '@/lib/admin/booking-settings-wording'

describe('describeBookingNotice', () => {
  it('dit qu’aucun délai ne s’applique quand la valeur est nulle', () => {
    expect(describeBookingNotice(0)).toContain('Aucun délai')
  })

  it('donne une heure concrète en dessous de vingt-quatre heures', () => {
    expect(describeBookingNotice(12)).toBe(
      'Avec 12 heures, quelqu’un qui regarde le site à 8 h du matin ne peut rien prendre avant 20 h le jour même.',
    )
  })

  it('accorde le singulier', () => {
    expect(describeBookingNotice(1)).toContain('Avec 1 heure,')
  })

  it('bascule en jours au-delà de vingt-quatre heures, sans heure trompeuse', () => {
    const phrase = describeBookingNotice(72)
    expect(phrase).toContain('environ 3 jours')
    expect(phrase).not.toMatch(/\b\d+ h le jour même/)
  })
})

describe('describeBookingHorizon', () => {
  it('garde « mois » invariable', () => {
    expect(describeBookingHorizon(1)).toContain('après 1 mois')
    expect(describeBookingHorizon(3)).toContain('après 3 mois')
  })
})

describe('describeSlotInterval', () => {
  it('déroule les trois premières heures proposées', () => {
    expect(describeSlotInterval(15)).toBe(
      'Les heures proposées seront 9 h 00, 9 h 15, 9 h 30, et ainsi de suite.',
    )
    expect(describeSlotInterval(30)).toContain('9 h 00, 9 h 30, 10 h 00')
  })

  it('passe correctement l’heure pleine', () => {
    expect(describeSlotInterval(60)).toContain('9 h 00, 10 h 00, 11 h 00')
  })
})

describe('formatSlotIntervalLabel', () => {
  it('évite « toutes les 60 minutes »', () => {
    expect(formatSlotIntervalLabel(60)).toBe('Toutes les heures')
    expect(formatSlotIntervalLabel(15)).toBe('Toutes les 15 minutes')
  })
})

describe('describeLateRequests', () => {
  it('nomme ce que produit le réglage éteint', () => {
    const phrase = describeLateRequests(false, 12, 2)
    expect(phrase).toContain('Désactivé')
    expect(phrase).toContain('complète')
  })

  it('annonce la marge réelle quand le réglage est actif', () => {
    const phrase = describeLateRequests(true, 12, 2)
    expect(phrase).toContain('2 heures')
    expect(phrase).toContain('12 heures')
    expect(phrase).toContain('sur demande')
  })

  it('dit quand le plancher vide la marge au lieu de laisser un réglage sans effet', () => {
    const phrase = describeLateRequests(true, 12, 12)
    expect(phrase).toContain('Aucune heure ne sera proposée sur demande')
  })
})

describe('describeLateRequestFloor', () => {
  it('nomme l’absence de plancher', () => {
    expect(describeLateRequestFloor(0)).toContain('Aucun plancher')
  })

  it('accorde le pluriel des heures', () => {
    expect(describeLateRequestFloor(1)).toContain('dernière heure')
    expect(describeLateRequestFloor(2)).toContain('2 dernières heures')
  })
})
