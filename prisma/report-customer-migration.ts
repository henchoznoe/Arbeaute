import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'
import { PrismaClient } from './generated/prisma/client'

config({ path: '.env.local' })

interface AmbiguousIdentity {
  identityDigest: string
  appointmentCount: number
  appointmentIds: string[]
}

const main = async () => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required')

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })
  try {
    const identities = await prisma.$queryRaw<AmbiguousIdentity[]>`
      SELECT "identityDigest", "appointmentCount", "appointmentIds"
      FROM "customer_migration_ambiguity_report"
      ORDER BY "identityDigest"
    `
    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          ambiguousIdentityCount: identities.length,
          identities,
        },
        null,
        2,
      ),
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
