import { describe, expect, it } from 'vitest'
import { formatAppointmentCountdown } from '@/lib/admin/next-appointment'

const now = new Date('2026-08-15T10:00:00.000Z')
const inMinutes = (minutes: number): Date =>
  new Date(now.getTime() + minutes * 60_000)

describe('formatAppointmentCountdown', () => {
  it('annonce un rendez-vous déjà commencé', () => {
    expect(formatAppointmentCountdown(inMinutes(-1), now)).toBe('En cours')
    expect(formatAppointmentCountdown(inMinutes(-120), now)).toBe('En cours')
  })

  it('annonce le rendez-vous imminent', () => {
    expect(formatAppointmentCountdown(now, now)).toBe('Maintenant')
  })

  it('accorde le pluriel des minutes', () => {
    expect(formatAppointmentCountdown(inMinutes(1), now)).toBe('Dans 1 minute')
    expect(formatAppointmentCountdown(inMinutes(25), now)).toBe(
      'Dans 25 minutes',
    )
    expect(formatAppointmentCountdown(inMinutes(59), now)).toBe(
      'Dans 59 minutes',
    )
  })

  it('bascule en heures à partir de soixante minutes', () => {
    expect(formatAppointmentCountdown(inMinutes(60), now)).toBe('Dans 1 h')
    expect(formatAppointmentCountdown(inMinutes(190), now)).toBe('Dans 3 h 10')
  })

  it('complète les minutes sur deux chiffres', () => {
    expect(formatAppointmentCountdown(inMinutes(65), now)).toBe('Dans 1 h 05')
  })

  it('bascule en jours au-delà de vingt-quatre heures', () => {
    expect(formatAppointmentCountdown(inMinutes(24 * 60), now)).toBe(
      'Dans 1 jour',
    )
    expect(formatAppointmentCountdown(inMinutes(3 * 24 * 60), now)).toBe(
      'Dans 3 jours',
    )
  })

  it('arrondit à la minute la plus proche', () => {
    const startsAt = new Date(now.getTime() + 89_000)
    expect(formatAppointmentCountdown(startsAt, now)).toBe('Dans 1 minute')
  })
})
