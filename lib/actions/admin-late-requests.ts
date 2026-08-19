'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { notifyLateRequestDeclined } from '@/lib/email/late-request-notifications'
import { notifyAppointmentConfirmed } from '@/lib/email/notifications'
import {
  acceptLateRequestSerializable,
  declineLateRequestSerializable,
  LateRequestError,
} from '@/lib/reservation/late-requests'
import { hasSameOrigin } from '@/lib/utils/request'

export interface AdminLateRequestResult {
  ok: boolean
  message: string
}

const acceptSchema = z.object({ requestId: z.string().min(1) })
const declineSchema = z.object({
  requestId: z.string().min(1),
  declineReason: z.string().trim().max(500).optional(),
})

const requireAdminMutation = async (): Promise<boolean> =>
  Boolean((await getAdminSession()) && (await hasSameOrigin()))

const refresh = () => {
  revalidatePath('/admin')
  revalidatePath('/admin/demandes')
  revalidatePath('/mes-rendez-vous')
}

/**
 * Accepte la demande : le rendez-vous est créé et la confirmation part.
 *
 * C'est bien une confirmation ordinaire que la personne reçoit — le rendez-vous
 * existe désormais pour de bon, avec sa pièce jointe d'agenda.
 */
export const acceptLateRequest = async (
  input: unknown,
): Promise<AdminLateRequestResult> => {
  if (!(await requireAdminMutation()))
    return { ok: false, message: 'Action impossible. Reconnectez-vous.' }

  const parsed = acceptSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, message: 'Demande introuvable. Rechargez la page.' }

  try {
    const { appointment } = await acceptLateRequestSerializable(
      prisma,
      parsed.data.requestId,
    )
    const recipient = notifyAppointmentConfirmed(appointment)
    refresh()
    revalidatePath(`/admin/appointments/${appointment.id}`)

    return {
      ok: true,
      message: recipient
        ? `Le rendez-vous est créé. La confirmation part à ${recipient}.`
        : 'Le rendez-vous est créé.',
    }
  } catch (error) {
    if (error instanceof LateRequestError) {
      if (error.code === 'OVERLAP')
        return {
          ok: false,
          message:
            'Cette heure se superpose à un rendez-vous existant. Déplacez l’autre rendez-vous, ou refusez la demande.',
        }
      if (error.code === 'ALREADY_DECIDED')
        return {
          ok: false,
          message: 'Cette demande a déjà reçu une réponse. Rechargez la page.',
        }
    }
    return {
      ok: false,
      message:
        'Le rendez-vous n’a pas pu être créé. Réessayez, ou prévenez le développeur si cela se reproduit.',
    }
  }
}

/** Refuse la demande, et le message part avec le motif s'il y en a un. */
export const declineLateRequest = async (
  input: unknown,
): Promise<AdminLateRequestResult> => {
  if (!(await requireAdminMutation()))
    return { ok: false, message: 'Action impossible. Reconnectez-vous.' }

  const parsed = declineSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, message: 'Demande introuvable. Rechargez la page.' }

  const declineReason = parsed.data.declineReason?.trim() || null

  try {
    const request = await declineLateRequestSerializable(
      prisma,
      parsed.data.requestId,
      declineReason,
    )
    const customer = await prisma.customer.findUnique({
      where: { id: request.customerId },
      select: { firstName: true, lastName: true, email: true, phone: true },
    })
    const recipient = customer
      ? notifyLateRequestDeclined(
          {
            customerFirstName: customer.firstName,
            customerLastName: customer.lastName,
            customerPhone: customer.phone,
            customerEmail: customer.email,
            serviceNameSnapshot: request.serviceNameSnapshot,
            servicePriceCents: request.servicePriceCents,
            requestedStartsAt: request.requestedStartsAt,
          },
          declineReason,
        )
      : null
    refresh()

    return {
      ok: true,
      message: recipient
        ? `La demande est refusée. Le message part à ${recipient}.`
        : 'La demande est refusée.',
    }
  } catch (error) {
    if (error instanceof LateRequestError && error.code === 'ALREADY_DECIDED')
      return {
        ok: false,
        message: 'Cette demande a déjà reçu une réponse. Rechargez la page.',
      }
    return {
      ok: false,
      message:
        'La demande n’a pas pu être refusée. Réessayez, ou prévenez le développeur si cela se reproduit.',
    }
  }
}
