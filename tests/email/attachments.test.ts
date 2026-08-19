import { describe, expect, it } from 'vitest'
import { createCalendarAttachment } from '@/lib/email/attachments'

const appointment = {
  id: 'apt-1',
  serviceLabel: 'Soins visage — Soin visage bio',
  startsAt: new Date('2026-08-17T11:30:00.000Z'),
  endsAt: new Date('2026-08-17T12:30:00.000Z'),
}

describe('createCalendarAttachment', () => {
  it('produit un .ics encodé en base64, comme l’attend Resend', () => {
    const attachment = createCalendarAttachment(appointment)
    expect(attachment?.filename).toBe('rendez-vous.ics')

    const calendar = Buffer.from(attachment?.content ?? '', 'base64').toString(
      'utf8',
    )
    expect(calendar).toContain('BEGIN:VCALENDAR')
    expect(calendar).toContain('SUMMARY:Soins visage — Soin visage bio')
    expect(calendar).toContain('DTSTART:20260817T113000Z')
  })

  it('renvoie null plutôt que de faire échouer un envoi', () => {
    // Une date invalide casse la mise en forme ICS. Le message doit partir
    // sans pièce jointe, jamais échouer à cause d'elle.
    expect(
      createCalendarAttachment({
        ...appointment,
        startsAt: new Date(Number.NaN),
      }),
    ).toBeNull()
  })
})
