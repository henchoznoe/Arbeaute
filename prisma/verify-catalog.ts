import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'
import { catalogCategories, catalogServices } from './catalog'
import { PrismaClient } from './generated/prisma/client'

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
})

const failures: string[] = []
const expectEqual = (
  label: string,
  actual: unknown,
  expected: unknown,
): void => {
  if (actual !== expected)
    failures.push(
      `${label}: attendu ${String(expected)}, reçu ${String(actual)}`,
    )
}

try {
  const [categories, services] = await Promise.all([
    prisma.serviceCategory.findMany({ orderBy: { slug: 'asc' } }),
    prisma.service.findMany({
      include: { category: { select: { slug: true } } },
      orderBy: { slug: 'asc' },
    }),
  ])

  const categoryBySlug = new Map(categories.map(item => [item.slug, item]))
  for (const expected of catalogCategories) {
    const actual = categoryBySlug.get(expected.slug)
    if (!actual) {
      failures.push(`Groupe manquant: ${expected.slug}`)
      continue
    }
    expectEqual(`${expected.slug}.name`, actual.name, expected.name)
    expectEqual(
      `${expected.slug}.description`,
      actual.description,
      expected.description,
    )
    expectEqual(`${expected.slug}.color`, actual.color, expected.color)
    expectEqual(
      `${expected.slug}.sortOrder`,
      actual.sortOrder,
      expected.sortOrder,
    )
    expectEqual(`${expected.slug}.isActive`, actual.isActive, true)
  }

  const serviceBySlug = new Map(services.map(item => [item.slug, item]))
  let blobImages = 0
  for (const expected of catalogServices) {
    const actual = serviceBySlug.get(expected.slug)
    if (!actual) {
      failures.push(`Prestation manquante: ${expected.slug}`)
      continue
    }
    expectEqual(`${expected.slug}.name`, actual.name, expected.name)
    expectEqual(
      `${expected.slug}.agendaSourceId`,
      actual.agendaSourceId,
      expected.agendaSourceId,
    )
    expectEqual(
      `${expected.slug}.category`,
      actual.category?.slug,
      expected.categorySlug,
    )
    expectEqual(
      `${expected.slug}.description`,
      actual.description,
      expected.description,
    )
    expectEqual(
      `${expected.slug}.durationMinutes`,
      actual.durationMinutes,
      expected.durationMinutes,
    )
    expectEqual(
      `${expected.slug}.priceCents`,
      actual.priceCents,
      expected.priceCents,
    )
    expectEqual(
      `${expected.slug}.priceNote`,
      actual.priceNote,
      expected.priceNote,
    )
    expectEqual(`${expected.slug}.color`, actual.color, expected.color)
    expectEqual(
      `${expected.slug}.sortOrder`,
      actual.sortOrder,
      expected.sortOrder,
    )
    expectEqual(
      `${expected.slug}.isBookable`,
      actual.isBookable,
      expected.isBookable,
    )
    expectEqual(`${expected.slug}.isVisible`, actual.isVisible, true)
    expectEqual(`${expected.slug}.isArchived`, actual.isArchived, false)

    if (actual.imageUrl?.includes('.blob.vercel-storage.com')) blobImages += 1
    if (actual.imageUrl?.includes('agenda.ch'))
      failures.push(`${expected.slug}.imageUrl dépend encore d’agenda.ch`)
    if (
      expected.sourceImageUrl &&
      !actual.imageUrl?.includes('.blob.vercel-storage.com')
    )
      failures.push(
        `${expected.slug}.imageUrl n’est pas migrée dans Vercel Blob`,
      )
  }

  if (failures.length) throw new Error(failures.join('\n'))

  const canonicalCategorySlugs = new Set(
    catalogCategories.map(category => category.slug),
  )
  const canonicalServiceSlugs = new Set(
    catalogServices.map(service => service.slug),
  )

  console.log(
    JSON.stringify({
      canonicalCategories: catalogCategories.length,
      canonicalServices: catalogServices.length,
      databaseCategories: categories.length,
      databaseServices: services.length,
      extraCategories: categories
        .filter(category => !canonicalCategorySlugs.has(category.slug))
        .map(category => category.slug),
      extraServices: services
        .filter(service => !canonicalServiceSlugs.has(service.slug))
        .map(service => service.slug),
      blobImages,
      agendaImageDependencies: 0,
      status: 'ok',
    }),
  )
} finally {
  await prisma.$disconnect()
}
