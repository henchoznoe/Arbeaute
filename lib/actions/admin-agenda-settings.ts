'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  AGENDA_SETTINGS_TAG,
  agendaSettingsSchema,
  saveAgendaSettingsAudited,
} from '@/lib/admin/agenda-settings'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { hasSameOrigin } from '@/lib/utils/request'

export const saveAgendaSettings = async (formData: FormData): Promise<void> => {
  if (!(await getAdminSession()) || !(await hasSameOrigin()))
    redirect('/admin/login')

  const parsed = agendaSettingsSchema.safeParse({
    visibleDays: formData.getAll('visibleDays'),
  })
  if (!parsed.success) redirect('/admin/settings/agenda?error=invalid')

  await saveAgendaSettingsAudited(prisma, parsed.data)
  updateTag(AGENDA_SETTINGS_TAG)
  revalidatePath('/admin')
  revalidatePath('/admin/settings/agenda')
  redirect('/admin/settings/agenda?saved=1')
}
