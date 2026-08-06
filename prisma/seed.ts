import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'
import { PrismaClient } from './generated/prisma/client'

config({ path: '.env.local' })

const ranges = [
  { startMinute: 8 * 60, endMinute: 11 * 60 + 30 },
  { startMinute: 13 * 60 + 30, endMinute: 18 * 60 + 30 },
]

const main = async () => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required to seed')

  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  try {
    for (const dayOfWeek of [1, 2, 3])
      for (const range of ranges)
        await prisma.weeklyAvailability.upsert({
          where: {
            dayOfWeek_startMinute_endMinute: { dayOfWeek, ...range },
          },
          update: {},
          create: { dayOfWeek, ...range },
        })
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
