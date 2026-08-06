import { createHmac } from 'node:crypto'
import { cookies } from 'next/headers'
import { env, isProd } from '@/lib/core/env'
import {
  createSessionToken,
  type SessionPayload,
  verifySessionToken,
} from '@/lib/core/session'
import {
  ADMIN_COOKIE_NAME,
  ADMIN_TTL_SECONDS,
  CUSTOMER_COOKIE_NAME,
  CUSTOMER_TTL_SECONDS,
} from '@/lib/core/session-config'

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
})

export const setAdminSession = async (): Promise<void> => {
  const token = await createSessionToken({
    kind: 'admin',
    subject: 'admin',
    ttlSeconds: ADMIN_TTL_SECONDS,
    secret: env.ADMIN_SESSION_SECRET,
  })
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, token, cookieOptions(ADMIN_TTL_SECONDS))
}

export const getAdminSession = async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies()
  return verifySessionToken(
    cookieStore.get(ADMIN_COOKIE_NAME)?.value,
    env.ADMIN_SESSION_SECRET,
    'admin',
  )
}

export const clearAdminSession = async (): Promise<void> => {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE_NAME)
}

export const createCustomerIdentityDigest = (
  email: string,
  phone: string,
): string =>
  createHmac('sha256', env.CUSTOMER_SESSION_SECRET)
    .update(`${email.trim().toLowerCase()}\0${phone.trim()}`)
    .digest('base64url')

export const setCustomerSession = async (
  identityDigest: string,
  identityVersion: number,
): Promise<void> => {
  const token = await createSessionToken({
    kind: 'customer',
    subject: identityDigest,
    version: identityVersion,
    ttlSeconds: CUSTOMER_TTL_SECONDS,
    secret: env.CUSTOMER_SESSION_SECRET,
  })
  const cookieStore = await cookies()
  cookieStore.set(
    CUSTOMER_COOKIE_NAME,
    token,
    cookieOptions(CUSTOMER_TTL_SECONDS),
  )
}

export const getCustomerSession = async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies()
  return verifySessionToken(
    cookieStore.get(CUSTOMER_COOKIE_NAME)?.value,
    env.CUSTOMER_SESSION_SECRET,
    'customer',
  )
}

export const clearCustomerSession = async (): Promise<void> => {
  const cookieStore = await cookies()
  cookieStore.delete(CUSTOMER_COOKIE_NAME)
}
