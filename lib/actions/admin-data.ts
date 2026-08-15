'use server'

import { z } from 'zod/v4'
import {
  type AnonymizationPreview,
  anonymizeCustomer,
  customerIdentityDigest,
  getCustomerAnonymizationPreview,
} from '@/lib/admin/data-management'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { normalizeEmail, normalizePhone } from '@/lib/reservation/identity'
import { hasSameOrigin } from '@/lib/utils/request'

const identitySchema = z.object({
  email: z.string().trim().min(1).max(254),
  phone: z.string().trim().min(1).max(40),
})

const anonymizationSchema = z.object({
  customerId: z.string().min(1),
  confirmation: z.string().max(100),
})

const requireAdminMutation = async (): Promise<boolean> =>
  Boolean((await getAdminSession()) && (await hasSameOrigin()))

export interface AnonymizationResult {
  ok: boolean
  message: string
  preview?: AnonymizationPreview
}

export const previewCustomerAnonymization = async (
  input: unknown,
): Promise<AnonymizationResult> => {
  if (!(await requireAdminMutation()))
    return { ok: false, message: 'Votre session admin a expiré.' }
  const parsed = identitySchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, message: 'Vérifiez les coordonnées saisies.' }

  try {
    const email = normalizeEmail(parsed.data.email)
    const phone = normalizePhone(parsed.data.phone)
    const preview = await getCustomerAnonymizationPreview(
      prisma,
      customerIdentityDigest(email, phone),
    )
    if (!preview)
      return {
        ok: false,
        message: 'Aucune cliente active ne correspond à ces coordonnées.',
      }
    return { ok: true, message: 'Cliente trouvée.', preview }
  } catch {
    return { ok: false, message: 'Vérifiez les coordonnées saisies.' }
  }
}

export const confirmCustomerAnonymization = async (
  input: unknown,
): Promise<AnonymizationResult> => {
  if (!(await requireAdminMutation()))
    return { ok: false, message: 'Votre session admin a expiré.' }
  const parsed = anonymizationSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, message: 'La confirmation est invalide.' }

  try {
    const result = await anonymizeCustomer(
      prisma,
      parsed.data.customerId,
      parsed.data.confirmation,
    )
    return {
      ok: true,
      message: `Cliente anonymisée. ${result.appointmentCount} rendez-vous et ${result.activityCount} activités ont été nettoyés.`,
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error && error.message === 'INVALID_CONFIRMATION'
          ? 'La phrase ne correspond plus au nombre de rendez-vous. Relancez l’aperçu.'
          : 'Cette cliente ne peut plus être anonymisée.',
    }
  }
}
