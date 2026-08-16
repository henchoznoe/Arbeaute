'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'
import {
  AdminCustomerProfileError,
  mergeAdminCustomers,
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
  propagateFuture: z.boolean(),
})

const mergeSchema = z.object({
  targetId: z.string().min(1),
  sourceId: z.string().min(1),
})

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
      message: 'Votre session a expiré. Reconnectez-vous, puis recommencez.',
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
      propagateFuture: parsed.data.propagateFuture,
    })
    refreshCustomerViews(parsed.data.customerId)
    return {
      ok: true,
      message: parsed.data.propagateFuture
        ? `Fiche enregistrée et ${result.propagatedAppointments} rendez-vous futur${result.propagatedAppointments > 1 ? 's' : ''} actualisé${result.propagatedAppointments > 1 ? 's' : ''}.`
        : 'Fiche cliente enregistrée sans modifier les snapshots des rendez-vous.',
    }
  } catch (error) {
    if (
      error instanceof AdminCustomerProfileError &&
      error.code === 'IDENTITY_CONFLICT'
    )
      return {
        ok: false,
        message:
          'Ces coordonnées appartiennent déjà à une autre fiche. Utilisez la fusion de doublons.',
      }
    return {
      ok: false,
      message:
        'La fiche n’a pas pu être enregistrée. Réessayez ; si cela recommence, notez l’heure et prévenez Noé.',
    }
  }
}

export const mergeAdminCustomerProfiles = async (
  input: unknown,
): Promise<AdminCustomerActionResult> => {
  if (!(await requireAdminMutation()))
    return {
      ok: false,
      message: 'Votre session a expiré. Reconnectez-vous, puis recommencez.',
    }
  const parsed = mergeSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, message: 'Cette fusion est invalide.' }
  try {
    const result = await mergeAdminCustomers(
      prisma,
      parsed.data.targetId,
      parsed.data.sourceId,
    )
    refreshCustomerViews(parsed.data.targetId)
    return {
      ok: true,
      message: `Doublon fusionné. ${result.movedAppointments} rendez-vous rattaché${result.movedAppointments > 1 ? 's' : ''} à cette fiche.`,
    }
  } catch {
    return {
      ok: false,
      message: 'Ces deux fiches ne peuvent plus être fusionnées.',
    }
  }
}
