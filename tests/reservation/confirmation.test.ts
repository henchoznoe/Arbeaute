import { describe, expect, it } from 'vitest'
import { contact } from '@/lib/constants/contact'
import {
  createAppointmentDetails,
  createGoogleCalendarUrl,
} from '@/lib/reservation/confirmation'

const appointment = {
  serviceName: 'Soin visage bio',
  dateLabel: 'lundi 10 août 2026 à 08:00',
  startsAt: '2026-08-10T06:00:00.000Z',
  endsAt: '2026-08-10T07:30:00.000Z',
}

describe('appointment confirmation helpers', () => {
  it('creates human-readable details without a technical identifier', () => {
    const details = createAppointmentDetails(appointment)

    expect(details).toContain(`Soin : ${appointment.serviceName}`)
    expect(details).toContain(`Horaire : ${appointment.dateLabel}`)
    expect(details).toContain(`Adresse : ${contact.address}`)
    expect(details).toContain(`Téléphone : ${contact.phone}`)
    expect(details).not.toContain('UID')
    expect(details).not.toContain('appointment-id')
  })

  it('creates a pre-filled Google Calendar event in UTC', () => {
    const url = new URL(createGoogleCalendarUrl(appointment))

    expect(url.origin).toBe('https://calendar.google.com')
    expect(url.pathname).toBe('/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('text')).toContain(appointment.serviceName)
    expect(url.searchParams.get('dates')).toBe(
      '20260810T060000Z/20260810T073000Z',
    )
    expect(url.searchParams.get('location')).toBe(contact.address)
  })
})
