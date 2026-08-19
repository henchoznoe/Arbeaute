'use server'

import { z } from 'zod/v4'
import { ADMIN_SESSION_EXPIRED } from '@/lib/actions/messages'
import {
  type AdminCustomerSearchPage,
  getAdminCustomerSearchPage,
} from '@/lib/admin/customer-search'
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
    return {
      ok: false,
      message: ADMIN_SESSION_EXPIRED,
    }
  const parsed = searchSchema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      message:
        'Un des filtres n’est pas valable. Réinitialisez-les, puis relancez la recherche.',
    }
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
      message:
        'La recherche ne répond pas pour le moment. Réessayez dans un instant.',
    }
  }
}

const customerSearchSchema = z.object({
  query: z.string().trim().max(100),
  page: z.number().int().min(1).max(500),
})

export interface AdminCustomerSearchActionResult {
  ok: boolean
  message: string
  result?: AdminCustomerSearchPage
}

export const searchAdminCustomerPage = async (
  input: z.infer<typeof customerSearchSchema>,
): Promise<AdminCustomerSearchActionResult> => {
  if (!(await getAdminSession()) || !(await hasSameOrigin()))
    return {
      ok: false,
      message: ADMIN_SESSION_EXPIRED,
    }
  const parsed = customerSearchSchema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      message:
        'Cette recherche n’est pas valable. Effacez-la, puis recommencez.',
    }
  try {
    const result = await getAdminCustomerSearchPage(prisma, parsed.data)
    return {
      ok: true,
      message: `${result.totalCount} client${result.totalCount > 1 ? 's' : ''} trouvé${result.totalCount > 1 ? 's' : ''}.`,
      result,
    }
  } catch {
    return {
      ok: false,
      message:
        'La recherche ne répond pas pour le moment. Réessayez dans un instant.',
    }
  }
}
