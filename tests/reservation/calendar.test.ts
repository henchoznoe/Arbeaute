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
  })
})
