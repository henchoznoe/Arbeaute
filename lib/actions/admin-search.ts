'use server'

import { z } from 'zod/v4'
import {
  type AdminSearchInput,
  type AdminSearchPage,
  getAdminSearchPage,
} from '@/lib/admin/search'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { isDateKey } from '@/lib/reservation/time'
import { hasSameOrigin } from '@/lib/utils/request'
import {
  AppointmentSource,
  AppointmentStatus,
} from '@/prisma/generated/prisma/enums'

const searchSchema = z
  .object({
    query: z.string().trim().max(100),
    serviceId: z.string().min(1).optional(),
    status: z.enum(AppointmentStatus).optional(),
    source: z.enum(AppointmentSource).optional(),
    from: z.string().refine(isDateKey).optional(),
    to: z.string().refine(isDateKey).optional(),
    page: z.number().int().min(1).max(500),
  })
  .refine(value => !value.from || !value.to || value.from <= value.to)

export interface AdminSearchActionResult {
  ok: boolean
  message: string
  result?: AdminSearchPage
}

export const searchAdminAppointments = async (
  input: AdminSearchInput,
): Promise<AdminSearchActionResult> => {
  if (!(await getAdminSession()) || !(await hasSameOrigin()))
    return { ok: false, message: 'Votre session admin a expiré.' }
  const parsed = searchSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, message: 'Vérifiez les filtres de recherche.' }
  try {
    const result = await getAdminSearchPage(prisma, parsed.data)
    return {
      ok: true,
      message: `${result.totalCount} rendez-vous trouvé${result.totalCount > 1 ? 's' : ''}.`,
      result,
    }
  } catch {
    return {
      ok: false,
      message: 'La recherche est momentanément indisponible.',
    }
  }
}
