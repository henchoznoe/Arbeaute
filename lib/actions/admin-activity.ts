'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { hasSameOrigin } from '@/lib/utils/request'

export const markAllAppointmentActivitiesRead = async (): Promise<void> => {
  if (!(await getAdminSession()) || !(await hasSameOrigin()))
    redirect('/admin/login')

  await prisma.appointmentActivity.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  })
  revalidatePath('/admin')
  revalidatePath('/admin/activity')
}
