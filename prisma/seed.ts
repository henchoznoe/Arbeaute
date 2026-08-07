import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'
import { catalogCategories, catalogServices } from './catalog'
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
    for (const category of catalogCategories)
      await prisma.serviceCategory.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          description: category.description,
          color: category.color,
          sortOrder: category.sortOrder,
          isActive: true,
        },
        create: {
          id: `category-${category.slug}`,
          ...category,
          isActive: true,
        },
      })

    for (const service of catalogServices) {
      const {
        categorySlug,
        sourceImageUrl: _sourceImageUrl,
        ...serviceData
      } = service

      await prisma.service.upsert({
        where: { slug: service.slug },
        update: {
          ...serviceData,
          category: { connect: { slug: categorySlug } },
          preparationMinutes: 0,
          cleanupMinutes: 0,
          isVisible: true,
          isArchived: false,
        },
        create: {
          id: `service-${service.slug}`,
          ...serviceData,
          category: { connect: { slug: categorySlug } },
          preparationMinutes: 0,
          cleanupMinutes: 0,
          isVisible: true,
          isArchived: false,
        },
      })
    }

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
