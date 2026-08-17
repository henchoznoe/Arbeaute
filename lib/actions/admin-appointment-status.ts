'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'
import {
  AdminAppointmentStatusError,
  type AdminAppointmentStatusTarget,
  changeAdminAppointmentStatusSerializable,
} from '@/lib/admin/appointment-status'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { hasSameOrigin } from '@/lib/utils/request'

const appointmentStatusSchema = z.object({
  appointmentId: z.string().min(1),
  targetStatus: z.enum(['CONFIRMED', 'COMPLETED', 'NO_SHOW']),
})

export interface AdminAppointmentStatusActionResult {
  ok: boolean
  message: string
}

export const changeAdminAppointmentStatus = async (input: {
  appointmentId: string
  targetStatus: AdminAppointmentStatusTarget
}): Promise<AdminAppointmentStatusActionResult> => {
  if (!(await getAdminSession()) || !(await hasSameOrigin()))
    return {
      ok: false,
      message: 'Votre session a expiré. Reconnectez-vous, puis recommencez.',
    }
  const parsed = appointmentStatusSchema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      message:
        'Ce changement n’est pas possible pour ce rendez-vous. Revenez à l’agenda et rouvrez-le.',
    }
  try {
    const appointment = await changeAdminAppointmentStatusSerializable(
      prisma,
      parsed.data.appointmentId,
      parsed.data.targetStatus,
    )
    revalidatePath('/admin')
    revalidatePath('/admin/search')
    revalidatePath(`/admin/appointments/${appointment.id}`)
    if (appointment.customerId)
      revalidatePath(`/admin/customers/${appointment.customerId}`)
    revalidatePath('/mes-rendez-vous')
    return {
      ok: true,
      message:
        appointment.status === 'COMPLETED'
          ? 'Le rendez-vous est marqué comme terminé.'
          : appointment.status === 'NO_SHOW'
            ? 'Le rendez-vous est marqué comme absence.'
            : 'Le rendez-vous est de nouveau confirmé.',
    }
  } catch (error) {
    if (
      error instanceof AdminAppointmentStatusError &&
      error.code === 'OVERLAP'
    )
      return {
        ok: false,
        message:
          'Cette heure se superpose maintenant à un autre rendez-vous confirmé. Déplacez-en un, puis réessayez.',
      }
    return {
      ok: false,
      message:
        'Ce rendez-vous a changé entre-temps. Revenez à l’agenda et rouvrez-le pour voir son état actuel.',
    }
  }
}
