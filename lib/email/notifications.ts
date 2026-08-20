import { after } from 'next/server'
import { isEmailConfigured } from '@/lib/core/env'
import { createCalendarAttachment } from '@/lib/email/attachments'
import { deliverEmail } from '@/lib/email/send'
import {
  type AppointmentMailData,
  buildCancelledMail,
  buildConfirmationMail,
  buildRescheduledMail,
  buildSeriesConfirmationMail,
} from '@/lib/email/templates'
import { formatServiceLabel } from '@/lib/reservation/service-label'

/**
 * Point d'entrée des notifications liées à un rendez-vous.
 *
 * L'envoi passe par `after()` : il s'exécute une fois la réponse rendue, donc
 * la confirmation s'affiche à l'écran sans attendre Resend, et une panne
 * du service ne rallonge ni ne casse la réservation.
 */

interface NotifiableAppointment {
  id: string
  customerEmail: string | null
  customerFirstName: string | null
  customerLastName: string
  serviceNameSnapshot: string
  servicePriceCents: number
  startsAt: Date
  endsAt: Date
  /**
   * Obligatoire, et non facultatif : une signature tolérante laissait passer
   * les appelants qui ne joignaient pas le groupe, et l'e-mail annonçait alors
   * « Visage » sans dire lequel des trois.
   */
  categoryName: string | null
}

const toMailData = (
  appointment: NotifiableAppointment,
  previousStartsAt?: Date,
): AppointmentMailData => ({
  customerFirstName: appointment.customerFirstName,
  customerLastName: appointment.customerLastName,
  serviceLabel: formatServiceLabel(
    appointment.serviceNameSnapshot,
    appointment.categoryName,
  ),
  startsAt: appointment.startsAt,
  endsAt: appointment.endsAt,
  priceCents: appointment.servicePriceCents,
  previousStartsAt,
  customerEmail: appointment.customerEmail,
})

const queue = (
  appointment: NotifiableAppointment,
  kind: 'BOOKING_CONFIRMATION' | 'BOOKING_RESCHEDULED' | 'BOOKING_CANCELLED',
  build: (data: AppointmentMailData) => {
    subject: string
    text: string
    html: string
  },
  previousStartsAt?: Date,
  withCalendar = true,
): string | null => {
  const recipient = appointment.customerEmail
  // Sans envoi configuré, rien n'est mis en file : l'écran de confirmation
  // s'appuie sur cette réponse pour ne pas promettre un e-mail qui ne part pas.
  if (!recipient || !isEmailConfigured) return null

  const content = build(toMailData(appointment, previousStartsAt))
  // Le rendez-vous annulé n'a plus rien à mettre dans un agenda, et une série
  // ne peut pas en joindre une seule occurrence sans induire en erreur.
  const attachment =
    !withCalendar || kind === 'BOOKING_CANCELLED'
      ? null
      : createCalendarAttachment({
          ...appointment,
          serviceLabel: formatServiceLabel(
            appointment.serviceNameSnapshot,
            appointment.categoryName,
          ),
        })

  after(async () => {
    await deliverEmail({
      kind,
      to: recipient,
      appointmentId: appointment.id,
      ...content,
      ...(attachment ? { attachments: [attachment] } : {}),
    })
  })
  return recipient
}

/** Renvoie l'adresse à laquelle la confirmation part, ou `null` si rien ne part. */
export const notifyAppointmentConfirmed = (
  appointment: NotifiableAppointment,
): string | null =>
  queue(appointment, 'BOOKING_CONFIRMATION', buildConfirmationMail)

/** Renvoie l'adresse prévenue, ou `null` si personne ne l'a été. */
export const notifyAppointmentRescheduled = (
  appointment: NotifiableAppointment,
  previousStartsAt: Date,
): string | null =>
  queue(
    appointment,
    'BOOKING_RESCHEDULED',
    buildRescheduledMail,
    previousStartsAt,
  )

/** Renvoie l'adresse prévenue, ou `null` si personne ne l'a été. */
export const notifyAppointmentCancelled = (
  appointment: NotifiableAppointment,
): string | null => queue(appointment, 'BOOKING_CANCELLED', buildCancelledMail)

/**
 * Une série : un seul message, qui liste les occurrences.
 *
 * La trace est rattachée au premier rendez-vous. Un renvoi depuis
 * `/admin/emails` reconstruira donc la confirmation de celui-là seul — moins
 * complet que l'original, mais jamais faux.
 */
export const notifyAppointmentSeriesConfirmed = (
  appointments: NotifiableAppointment[],
): string | null => {
  const [first] = appointments
  if (!first) return null
  if (appointments.length === 1) return notifyAppointmentConfirmed(first)

  return queue(
    first,
    'BOOKING_CONFIRMATION',
    data =>
      buildSeriesConfirmationMail(
        data,
        appointments.map(appointment => appointment.startsAt),
      ),
    undefined,
    false,
  )
}
