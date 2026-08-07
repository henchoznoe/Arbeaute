import prisma from '@/lib/core/prisma'
import { checkRateLimit } from '@/lib/services/rate-limit'

const action = '__RECIPE_RATE_LIMIT__'
const rawKey = '203.0.113.10'

try {
  await prisma.rateLimitBucket.deleteMany({ where: { action } })
  const results = []
  for (let attempt = 0; attempt < 3; attempt += 1)
    results.push(
      await checkRateLimit({
        action,
        key: rawKey,
        limit: 2,
        windowMs: 15 * 60 * 1000,
      }),
    )

  if (
    !results[0].allowed ||
    !results[1].allowed ||
    results[2].allowed ||
    results[2].remaining !== 0
  )
    throw new Error('La limite de tentatives ne bloque pas au seuil attendu')

  const buckets = await prisma.rateLimitBucket.findMany({ where: { action } })
  if (
    buckets.length !== 1 ||
    buckets[0].count !== 3 ||
    buckets[0].keyHash.includes(rawKey)
  )
    throw new Error('Le compteur ou le hash de la clé est invalide')

  console.log(
    JSON.stringify({
      allowed: [true, true, false],
      rawKeyStored: false,
      status: 'ok',
    }),
  )
} finally {
  await prisma.rateLimitBucket.deleteMany({ where: { action } })
  await prisma.$disconnect()
}
