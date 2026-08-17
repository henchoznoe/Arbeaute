'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  bookingSettingsSchema,
  saveBookingSettingsAudited,
} from '@/lib/admin/booking-settings'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { BOOKING_SETTINGS_TAG } from '@/lib/reservation/booking-settings'
import { hasSameOrigin } from '@/lib/utils/request'

export const saveBookingSettings = async (
  formData: FormData,
): Promise<void> => {
  if (!(await getAdminSession()) || !(await hasSameOrigin()))
    redirect('/admin/login')

  const parsed = bookingSettingsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/admin/settings/booking?error=invalid')

  await saveBookingSettingsAudited(prisma, parsed.data)
  updateTag(BOOKING_SETTINGS_TAG)
  revalidatePath('/')
  revalidatePath('/reservation')
  revalidatePath('/mes-rendez-vous')
  revalidatePath('/conditions-generales')
  revalidatePath('/admin')
  revalidatePath('/admin/settings/booking')
  redirect('/admin/settings/booking?saved=1')
}
