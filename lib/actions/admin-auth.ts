'use server'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { redirect } from 'next/navigation'
import { env } from '@/lib/core/env'
import { clearAdminSession, setAdminSession } from '@/lib/core/session-cookies'
import { checkRateLimit } from '@/lib/services/rate-limit'
import { getRequestIp } from '@/lib/utils/request'

const passwordsMatch = (candidate: string): boolean => {
  const digest = (value: string) =>
    createHmac('sha256', env.ADMIN_SESSION_SECRET).update(value).digest()

  return timingSafeEqual(digest(candidate), digest(env.ADMIN_PASSWORD))
}

export const loginAdmin = async (formData: FormData): Promise<void> => {
  const password = formData.get('password')
  const ip = await getRequestIp()
  let authenticated = false

  try {
    const rateLimit = await checkRateLimit({
      action: 'admin-login',
      key: ip,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })

    authenticated =
      rateLimit.allowed &&
      typeof password === 'string' &&
      passwordsMatch(password)
  } catch {}

  if (!authenticated) redirect('/admin/login?error=invalid')

  await setAdminSession()
  redirect('/admin')
}

export const logoutAdmin = async (): Promise<void> => {
  await clearAdminSession()
  redirect('/')
}
