import type { MailAttachment } from '@/lib/email/client'
import { createAppointmentCalendar } from '@/lib/reservation/calendar'

/**
 * Le rendez-vous en pièce jointe, au format `.ics`.
 *
 * Le même fichier que celui proposé par l'écran de confirmation et par « Mes
 * rendez-vous » : une seule source, `createAppointmentCalendar`.
 *
 * La construction est enveloppée parce qu'un message qui part sans pièce
 * jointe vaut infiniment mieux qu'un message qui ne part pas. L'appelant reçoit
 * alors `null` et envoie sans.
 */
export const createCalendarAttachment = (appointment: {
  id: string
  serviceNameSnapshot: string
  startsAt: Date
  endsAt: Date
}): MailAttachment | null => {
  try {
    const calendar = createAppointmentCalendar({
      id: appointment.id,
      serviceName: appointment.serviceNameSnapshot,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
    })
    return {
      filename: 'rendez-vous.ics',
      content: Buffer.from(calendar, 'utf8').toString('base64'),
    }
  } catch {
    return null
  }
}
