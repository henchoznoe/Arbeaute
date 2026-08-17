import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'
import { PrismaClient } from './generated/prisma/client'

config({ path: '.env.local' })

/**
 * Rapport en lecture seule des fiches partageant une adresse e-mail.
 *
 * À lancer sur la base de production **avant** la migration
 * `email_only_identity`, qui fusionne ces fiches et pose un index unique : le
 * rapport dit à l'avance ce que la fusion va toucher. Aucune donnée n'est
 * modifiée, et rien n'est affiché en dehors de l'adresse et du nombre de
 * rendez-vous concernés.
 */
interface DuplicateGroup {
  emailNormalized: string
  customerCount: number
  appointmentCount: number
}

const main = async () => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required')

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })
  try {
    const groups = await prisma.$queryRaw<DuplicateGroup[]>`
      SELECT
        customer."emailNormalized",
        COUNT(DISTINCT customer.id)::INTEGER AS "customerCount",
        COUNT(appointment.id)::INTEGER AS "appointmentCount"
      FROM "customer" AS customer
      LEFT JOIN "appointment" AS appointment
        ON appointment."customerId" = customer.id
      GROUP BY customer."emailNormalized"
      HAVING COUNT(DISTINCT customer.id) > 1
      ORDER BY customer."emailNormalized"
    `
    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          duplicateEmailCount: groups.length,
          groups,
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
