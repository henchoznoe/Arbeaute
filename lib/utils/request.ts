import { headers } from 'next/headers'

export const getRequestIp = async (): Promise<string> => {
  const headerStore = await headers()
  const forwardedFor = headerStore.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || 'unknown'
}

export const hasSameOrigin = async (): Promise<boolean> => {
  const headerStore = await headers()
  const origin = headerStore.get('origin')
  const host =
    headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? ''
  if (!origin || !host) return false

  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
