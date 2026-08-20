'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'
import { ADMIN_SESSION_EXPIRED } from '@/lib/actions/messages'
import {
  AdminCustomerProfileError,
  updateAdminCustomer,
} from '@/lib/admin/customer-profile'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { normalizeEmail, normalizePhone } from '@/lib/reservation/identity'
import { hasSameOrigin } from '@/lib/utils/request'

const updateSchema = z.object({
  customerId: z.string().min(1),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().min(1).max(254),
  phone: z.string().trim().min(1).max(40),
  internalNote: z.string().trim().max(2000).optional(),
  preferences: z.string().trim().max(500).optional(),
})

/**
 * Ce que l'enregistrement a touché, en clair.
 *
 * Le comportement n'est plus un choix : les rendez-vous à venir suivent
 * toujours les coordonnées. Le message est donc le seul endroit qui l'explique,
 * et il doit le faire sans nommer ni copie, ni propagation, ni snapshot.
 */
const describeCustomerSave = (updatedAppointments: number): string => {
  if (updatedAppointments === 0) return 'Client enregistré.'
  const subject =
    updatedAppointments === 1
      ? 'Son rendez-vous à venir porte'
      : `Ses ${updatedAppointments} rendez-vous à venir portent`
  return `Client enregistré. ${subject} les nouvelles coordonnées ; les rendez-vous passés gardent celles d’alors.`
}

export interface AdminCustomerActionResult {
  ok: boolean
  message: string
}

const requireAdminMutation = async (): Promise<boolean> =>
  Boolean((await getAdminSession()) && (await hasSameOrigin()))

const refreshCustomerViews = (customerId: string) => {
  revalidatePath(`/admin/customers/${customerId}`)
  revalidatePath('/admin/search')
  revalidatePath('/admin')
  revalidatePath('/mes-rendez-vous')
}

export const saveAdminCustomerProfile = async (
  input: unknown,
): Promise<AdminCustomerActionResult> => {
  if (!(await requireAdminMutation()))
    return {
      ok: false,
      message: ADMIN_SESSION_EXPIRED,
    }
  const parsed = updateSchema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      message:
        'Certaines informations sont incomplètes ou mal formées. Corrigez les champs signalés, puis réessayez.',
    }
  try {
    const email = normalizeEmail(parsed.data.email)
    const phone = normalizePhone(parsed.data.phone)
    const result = await updateAdminCustomer(prisma, {
      customerId: parsed.data.customerId,
      firstName: parsed.data.firstName || null,
      lastName: parsed.data.lastName,
      email,
      phone,
      internalNote: parsed.data.internalNote || null,
      preferences: parsed.data.preferences || null,
    })
    refreshCustomerViews(parsed.data.customerId)
    return {
      ok: true,
      message: describeCustomerSave(result.updatedAppointments),
    }
  } catch (error) {
    if (
      error instanceof AdminCustomerProfileError &&
      error.code === 'IDENTITY_CONFLICT'
    )
      return {
        ok: false,
        message:
          'Cette adresse e-mail est déjà celle d’un autre client. Ouvrez ce client-là pour le modifier, ou saisissez une autre adresse.',
      }
    return {
      ok: false,
      message:
        'Le client n’a pas pu être enregistré. Réessayez ; si cela recommence, notez l’heure et prévenez Noé.',
    }
  }
}
