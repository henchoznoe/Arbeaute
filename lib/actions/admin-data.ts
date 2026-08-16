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
    return {
      ok: false,
      message: 'Votre session a expiré. Reconnectez-vous, puis recommencez.',
    }
  const parsed = identitySchema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      message:
        'L’email ou le téléphone n’est pas au bon format. Corrigez-les, puis réessayez.',
    }

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
        message:
          'Aucune cliente ne correspond à cet email et à ce téléphone. Vérifiez les deux, en les recopiant depuis un de ses rendez-vous.',
      }
    return { ok: true, message: 'Cliente trouvée.', preview }
  } catch {
    return {
      ok: false,
      message:
        'L’email ou le téléphone n’est pas au bon format. Corrigez-les, puis réessayez.',
    }
  }
}

export const confirmCustomerAnonymization = async (
  input: unknown,
): Promise<AnonymizationResult> => {
  if (!(await requireAdminMutation()))
    return {
      ok: false,
      message: 'Votre session a expiré. Reconnectez-vous, puis recommencez.',
    }
  const parsed = anonymizationSchema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      message:
        'La phrase recopiée ne correspond pas. Recopiez-la exactement, accents compris.',
    }

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
