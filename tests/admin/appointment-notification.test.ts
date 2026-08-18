import { describe, expect, it } from 'vitest'
import {
  describeAdminAppointmentChange,
  describeAdminNotification,
} from '@/lib/admin/appointment-notification'

const startsAt = new Date('2026-08-17T11:30:00.000Z')
const next = { startsAt, serviceId: 'service-1' }

describe('describeAdminAppointmentChange', () => {
  it('traite l’absence d’état précédent comme une création', () => {
    expect(describeAdminAppointmentChange(null, next)).toBe('created')
  })

  it('prévient quand l’horaire change', () => {
    expect(
      describeAdminAppointmentChange(
        {
          startsAt: new Date('2026-08-18T11:30:00.000Z'),
          serviceId: 'service-1',
        },
        next,
      ),
    ).toBe('rescheduled')
  })

  it('prévient quand le soin change', () => {
    expect(
      describeAdminAppointmentChange(
        { startsAt, serviceId: 'service-2' },
        next,
      ),
    ).toBe('rescheduled')
  })

  it('n’écrit à personne pour une correction de coquille', () => {
    // Même horaire, même soin : seuls le nom, le téléphone ou le commentaire
    // ont pu bouger, et cela ne déplace aucun rendez-vous.
    expect(
      describeAdminAppointmentChange(
        { startsAt: new Date(startsAt), serviceId: 'service-1' },
        next,
      ),
    ).toBe('unchanged')
  })
})

describe('describeAdminNotification', () => {
  it('nomme l’adresse prévenue', () => {
    expect(describeAdminNotification('marie@example.ch', true)).toContain(
      'marie@example.ch a été prévenu',
    )
  })

  it('dit clairement que personne ne sera prévenu, faute d’adresse', () => {
    expect(describeAdminNotification(null, true)).toContain(
      'Personne n’a été prévenu',
    )
  })

  it('reste muet quand aucun envoi n’était attendu', () => {
    expect(describeAdminNotification(null, false)).toBe('')
    expect(describeAdminNotification('marie@example.ch', false)).toBe('')
  })
})
