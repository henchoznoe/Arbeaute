import { createHmac } from 'node:crypto'
import { env } from '@/lib/core/env'
import prisma from '@/lib/core/prisma'

interface RateLimitOptions {
  action: string
  key: string
  limit: number
  windowMs: number
  now?: Date
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

const hashKey = (value: string): string =>
  createHmac('sha256', env.ADMIN_SESSION_SECRET)
    .update(value)
    .digest('base64url')

export const checkRateLimit = async ({
  action,
  key,
  limit,
  windowMs,
  now = new Date(),
}: RateLimitOptions): Promise<RateLimitResult> => {
  const windowStartMs = Math.floor(now.getTime() / windowMs) * windowMs
  const windowStart = new Date(windowStartMs)
  const expiresAt = new Date(windowStartMs + windowMs * 2)
  const keyHash = hashKey(key)

  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      keyHash_action_windowStart: { keyHash, action, windowStart },
    },
    update: { count: { increment: 1 }, expiresAt },
    create: { keyHash, action, windowStart, expiresAt },
    select: { count: true },
  })

  await prisma.rateLimitBucket.deleteMany({
    where: { expiresAt: { lt: now } },
  })

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStartMs + windowMs - now.getTime()) / 1000),
  )

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds,
  }
}
