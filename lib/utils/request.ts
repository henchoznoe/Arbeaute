import { headers } from 'next/headers'

export const getRequestIp = async (): Promise<string> => {
  const headerStore = await headers()
  const forwardedFor = headerStore.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || 'unknown'
}
