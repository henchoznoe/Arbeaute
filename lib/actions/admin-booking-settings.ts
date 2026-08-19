'use server'

import { updateTag } from 'next/cache'
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
  // Le tag suffit, et lui seul convient : tout ce qui lit ces réglages passe
  // par `getBookingSettings()` ou `getPublicBookingWindow()`, tous deux
  // marqués `BOOKING_SETTINGS_TAG`.
  //
  // Les `revalidatePath()` qui suivaient étaient redondants, et
  // `revalidatePath('/')` était nuisible : il expirait le layout racine, que
  // toutes les routes partagent. La redirection ci-dessous devait alors
  // recalculer `getOpeningHours()` pendant le prérendu du shell statique, hors
  // de tout `<Suspense>` — d'où l'erreur « uncached data during prerendering »
  // levée depuis `app/layout.tsx` à chaque enregistrement.
  updateTag(BOOKING_SETTINGS_TAG)
  redirect('/admin/settings/booking?saved=1')
}
