import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'
import {
  AdminAgendaError,
  saveAdminAppointmentSerializable,
} from '@/lib/admin/agenda'
import { PrismaClient } from './generated/prisma/client'

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
})
const marker = '__RECIPE_CONCURRENCY__'

try {
  await prisma.appointment.deleteMany({
    where: { customerLastName: { startsWith: marker } },
  })
  const service = await prisma.service.findFirstOrThrow({
    where: { isArchived: false },
    orderBy: { id: 'asc' },
  })
  const startsAt = new Date('2099-01-05T08:00:00.000Z')
  const create = (suffix: string) =>
    saveAdminAppointmentSerializable(prisma, {
      serviceId: service.id,
      startsAt,
      firstName: null,
      lastName: `${marker}${suffix}`,
      // Deux adresses distinctes : deux fiches, pour que seule la contrainte
      // d'exclusion sur les créneaux départage les deux créations.
      email: `concurrence-${suffix.toLowerCase()}@invalid.local`,
      phone: `+4179000000${suffix === 'A' ? '1' : '2'}`,
      comment: null,
    })

  const results = await Promise.allSettled([create('A'), create('B')])
  const fulfilled = results.filter(result => result.status === 'fulfilled')
  const rejected = results.filter(result => result.status === 'rejected')
  if (fulfilled.length !== 1 || rejected.length !== 1)
    throw new Error('Le verrou de concurrence n’a pas produit un seul gagnant')
  const rejection = rejected[0]
  if (
    rejection.status !== 'rejected' ||
    !(rejection.reason instanceof AdminAgendaError) ||
    rejection.reason.code !== 'OVERLAP'
  )
    throw new Error('Le conflit concurrent n’a pas été signalé par OVERLAP')

  const appointments = await prisma.appointment.findMany({
    where: { customerLastName: { startsWith: marker } },
  })
  if (
    appointments.length !== 1 ||
    appointments[0].customerFirstName !== null ||
    appointments[0].customerEmail === null ||
    appointments[0].customerPhone === null ||
    appointments[0].customerId === null ||
    appointments[0].source !== 'ADMIN'
  )
    throw new Error('Le rendez-vous manuel n’a pas les coordonnées attendues')

  console.log(
    JSON.stringify({
      created: 1,
      rejectedAsOverlap: 1,
      linkedToCustomer: true,
      status: 'ok',
    }),
  )
} finally {
  await prisma.appointment.deleteMany({
    where: { customerLastName: { startsWith: marker } },
  })
  // Uniquement les fiches de ce script : les coordonnées effacées portent aussi
  // une adresse en `@invalid.local`, et elles ne doivent jamais être touchées.
  await prisma.customer.deleteMany({
    where: { emailNormalized: { startsWith: 'concurrence-' } },
  })
  await prisma.$disconnect()
}
