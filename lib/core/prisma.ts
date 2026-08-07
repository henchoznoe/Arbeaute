import { PrismaPg } from '@prisma/adapter-pg'
import { env, isDev, isProd } from '@/lib/core/env'
import { PrismaClient } from '@/prisma/generated/prisma/client'

const createPrismaClient = () => {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
  return new PrismaClient({
    adapter,
    log: isDev ? ['error', 'warn'] : ['error'],
  })
}

type PrismaInstance = ReturnType<typeof createPrismaClient>

const globalForPrisma = global as unknown as {
  prisma: PrismaInstance | undefined
}

const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (!isProd) globalForPrisma.prisma = prisma

export default prisma
