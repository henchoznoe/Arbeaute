import { after } from 'next/server'
import { isEmailConfigured } from '@/lib/core/env'
import { deliverEmail } from '@/lib/email/send'
import {
  type AppointmentMailData,
  buildCancelledMail,
  buildConfirmationMail,
  buildRescheduledMail,
} from '@/lib/email/templates'
import { formatServiceLabel } from '@/lib/reservation/service-label'

/**
 * Point d'entrée des notifications liées à un rendez-vous.
 *
 * L'envoi passe par `after()` : il s'exécute une fois la réponse rendue, donc
 * la cliente voit sa confirmation à l'écran sans attendre Resend, et une panne
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
  categoryName?: string | null
}

const toMailData = (
  appointment: NotifiableAppointment,
  previousStartsAt?: Date,
): AppointmentMailData => ({
  customerFirstName: appointment.customerFirstName,
  customerLastName: appointment.customerLastName,
  serviceLabel: formatServiceLabel(
    appointment.serviceNameSnapshot,
    appointment.categoryName ?? undefined,
  ),
  startsAt: appointment.startsAt,
  priceCents: appointment.servicePriceCents,
  previousStartsAt,
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
): string | null => {
  const recipient = appointment.customerEmail
  // Sans envoi configuré, rien n'est mis en file : l'écran de confirmation
  // s'appuie sur cette réponse pour ne pas promettre un e-mail qui ne part pas.
  if (!recipient || !isEmailConfigured) return null

  const content = build(toMailData(appointment, previousStartsAt))
  after(async () => {
    await deliverEmail({
      kind,
      to: recipient,
      appointmentId: appointment.id,
      ...content,
    })
  })
  return recipient
}

/** Renvoie l'adresse à laquelle la confirmation part, ou `null` si rien ne part. */
export const notifyAppointmentConfirmed = (
  appointment: NotifiableAppointment,
): string | null =>
  queue(appointment, 'BOOKING_CONFIRMATION', buildConfirmationMail)

export const notifyAppointmentRescheduled = (
  appointment: NotifiableAppointment,
  previousStartsAt: Date,
): void => {
  queue(
    appointment,
    'BOOKING_RESCHEDULED',
    buildRescheduledMail,
    previousStartsAt,
  )
}

export const notifyAppointmentCancelled = (
  appointment: NotifiableAppointment,
): void => {
  queue(appointment, 'BOOKING_CANCELLED', buildCancelledMail)
}
