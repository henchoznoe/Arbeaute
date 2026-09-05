'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'
import { ADMIN_SESSION_EXPIRED } from '@/lib/actions/messages'
import {
  AdminRescheduleError,
  rescheduleAdminAppointment,
} from '@/lib/admin/reschedule'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { notifyAppointmentRescheduled } from '@/lib/email/notifications'
import { hasSameOrigin } from '@/lib/utils/request'

const schema = z.object({
  appointmentId: z.string().min(1).max(200),
  expectedStartsAt: z.iso.datetime(),
  startsAt: z.iso.datetime(),
})

export const moveAdminAppointment = async (input: {
  appointmentId: string
  expectedStartsAt: string
  startsAt: string
}) => {
  if (!(await getAdminSession()) || !(await hasSameOrigin()))
    return { ok: false, message: ADMIN_SESSION_EXPIRED }
  const parsed = schema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      message: 'Choisissez une des heures proposées, puis réessayez.',
    }
  try {
    const { appointment, previousStartsAt } = await rescheduleAdminAppointment(
      prisma,
      {
        appointmentId: parsed.data.appointmentId,
        expectedStartsAt: new Date(parsed.data.expectedStartsAt),
        startsAt: new Date(parsed.data.startsAt),
      },
    )
    const recipient = notifyAppointmentRescheduled(
      appointment,
      previousStartsAt,
    )
    revalidatePath('/admin', 'layout')
    revalidatePath('/mes-rendez-vous')
    return {
      ok: true,
      message: recipient
        ? `Le rendez-vous est déplacé. L’envoi d’un e-mail à ${recipient} est prévu. Son résultat sera visible dans « Messages envoyés » du rendez-vous.`
        : 'Le rendez-vous est déplacé. Aucun e-mail ne sera envoyé : appelez la personne pour lui confirmer la nouvelle heure.',
    }
  } catch (error) {
    if (error instanceof AdminRescheduleError)
      return {
        ok: false,
        message:
          error.code === 'CHANGED'
            ? 'Ce rendez-vous a changé. Les informations ont été actualisées : vérifiez-les avant de choisir une autre heure.'
            : 'Cette heure n’est plus disponible. Les propositions ont été actualisées : choisissez une autre heure.',
      }
    return {
      ok: false,
      message:
        'Le déplacement n’a pas pu être enregistré. Réessayez ; si cela recommence, prévenez Noé.',
    }
  }
}
