'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { deliverEmail } from '@/lib/email/send'
import {
  buildCancelledMail,
  buildConfirmationMail,
  buildRescheduledMail,
} from '@/lib/email/templates'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import { hasSameOrigin } from '@/lib/utils/request'
import type { EmailKind } from '@/prisma/generated/prisma/enums'

interface ResendResult {
  ok: boolean
  message: string
}

const builders = {
  BOOKING_CONFIRMATION: buildConfirmationMail,
  BOOKING_RESCHEDULED: buildRescheduledMail,
  BOOKING_CANCELLED: buildCancelledMail,
} as const satisfies Partial<Record<EmailKind, unknown>>

/**
 * Renvoie un e-mail dont l'envoi avait échoué.
 *
 * Le corps est reconstruit à partir du rendez-vous plutôt que relu d'une copie
 * stockée : rien de plus que l'objet et le destinataire n'est conservé.
 */
export const resendFailedEmail = async (
  deliveryId: string,
): Promise<ResendResult> => {
  if (!(await hasSameOrigin()))
    return {
      ok: false,
      message:
        'Cette demande n’est pas valable. Rafraîchissez la page, puis réessayez.',
    }
  if (!(await getAdminSession()))
    return {
      ok: false,
      message: 'Votre session a expiré. Reconnectez-vous, puis recommencez.',
    }

  const delivery = await prisma.emailDelivery.findUnique({
    where: { id: deliveryId },
    select: { id: true, kind: true, status: true, appointmentId: true },
  })
  if (!delivery)
    return {
      ok: false,
      message: 'Cet envoi n’est plus dans la liste. Rafraîchissez la page.',
    }
  if (delivery.status === 'SENT')
    return { ok: false, message: 'Cet e-mail est déjà parti.' }

  const build = builders[delivery.kind as keyof typeof builders]
  if (!build || !delivery.appointmentId)
    return {
      ok: false,
      message:
        'Ce message ne peut plus être reconstruit. Seules les confirmations, les déplacements et les annulations peuvent repartir.',
    }

  const appointment = await prisma.appointment.findUnique({
    where: { id: delivery.appointmentId },
    select: {
      id: true,
      startsAt: true,
      customerEmail: true,
      customerFirstName: true,
      customerLastName: true,
      serviceNameSnapshot: true,
      servicePriceCents: true,
      service: { select: { category: { select: { name: true } } } },
    },
  })
  if (!appointment?.customerEmail)
    return {
      ok: false,
      message:
        'Le rendez-vous n’a plus d’adresse e-mail. Ajoutez-en une sur sa fiche, puis réessayez.',
    }

  const content = build({
    customerFirstName: appointment.customerFirstName,
    customerLastName: appointment.customerLastName,
    serviceLabel: formatServiceLabel(
      appointment.serviceNameSnapshot,
      appointment.service.category?.name,
    ),
    startsAt: appointment.startsAt,
    priceCents: appointment.servicePriceCents,
  })

  const outcome = await deliverEmail({
    kind: delivery.kind,
    to: appointment.customerEmail,
    appointmentId: appointment.id,
    ...content,
  })
  revalidatePath('/admin/emails')

  if (outcome === 'sent') return { ok: true, message: 'L’e-mail est reparti.' }
  if (outcome === 'skipped')
    return {
      ok: false,
      message:
        'L’envoi d’e-mails n’est pas configuré sur ce site. Vérifiez la clé Resend.',
    }
  return {
    ok: false,
    message:
      'L’envoi a de nouveau échoué. Réessayez plus tard ; le détail est dans la liste ci-dessous.',
  }
}
