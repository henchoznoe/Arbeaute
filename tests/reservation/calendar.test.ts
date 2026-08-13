import { describe, expect, it } from 'vitest'
import { createAppointmentCalendar } from '@/lib/reservation/calendar'

describe('appointment calendar file', () => {
  it('contains the service, UTC schedule, address and generic management link', () => {
    const calendar = createAppointmentCalendar({
      id: 'appointment-id',
      serviceName: 'Soin visage',
      startsAt: new Date('2026-08-10T06:00:00.000Z'),
      endsAt: new Date('2026-08-10T07:30:00.000Z'),
    })

    expect(calendar).toContain('BEGIN:VCALENDAR')
    expect(calendar).toContain('DTSTART:20260810T060000Z')
    expect(calendar).toContain('DTEND:20260810T073000Z')
    expect(calendar).toContain('Soin visage')
    expect(calendar).toContain('Place du marché 25')
    expect(calendar).toContain('/mes-rendez-vous')
    expect(calendar).not.toContain('/mes-rendez-vous/appointment-id')
    expect(calendar).toContain('STATUS:CONFIRMED')
    expect(calendar).toContain('TRANSP:OPAQUE')
    expect(calendar.endsWith('\r\n')).toBe(true)
  })

  it('folds long UTF-8 lines without exceeding 75 octets', () => {
    const calendar = createAppointmentCalendar({
      id: 'appointment-id',
      serviceName:
        'Soin du visage très complet à l’acide hyaluronique et à la vitamine C',
      startsAt: new Date('2026-08-10T06:00:00.000Z'),
      endsAt: new Date('2026-08-10T07:30:00.000Z'),
    })

    for (const line of calendar.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)

    expect(calendar).toMatch(/\r\n /)
  })
})
