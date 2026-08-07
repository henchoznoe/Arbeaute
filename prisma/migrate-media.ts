import { PrismaPg } from '@prisma/adapter-pg'
import { put } from '@vercel/blob'
import { config } from 'dotenv'
import { catalogServices } from './catalog'
import { PrismaClient } from './generated/prisma/client'

config({ path: '.env.local' })

const contentTypeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const main = async () => {
  const connectionString = process.env.DATABASE_URL
  const storeId = process.env.BLOB_STORE_ID
  if (!connectionString) throw new Error('DATABASE_URL is required')
  if (!storeId) throw new Error('BLOB_STORE_ID is required')

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })

  try {
    for (const catalogService of catalogServices) {
      if (!catalogService.sourceImageUrl) continue

      const service = await prisma.service.findUniqueOrThrow({
        where: { slug: catalogService.slug },
        select: { id: true, imageUrl: true },
      })
      if (service.imageUrl?.includes('.blob.vercel-storage.com')) continue

      const response = await fetch(catalogService.sourceImageUrl)
      if (!response.ok)
        throw new Error(
          `Unable to download ${catalogService.slug}: ${response.status}`,
        )

      const contentType = response.headers.get('content-type')?.split(';')[0]
      const extension = contentType
        ? contentTypeExtensions[contentType]
        : undefined
      if (!contentType || !extension)
        throw new Error(`Unsupported media type for ${catalogService.slug}`)

      const bytes = await response.arrayBuffer()
      if (bytes.byteLength > 5 * 1024 * 1024)
        throw new Error(`Image exceeds 5 MB for ${catalogService.slug}`)

      const blob = await put(
        `services/${catalogService.slug}.${extension}`,
        bytes,
        {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType,
          storeId,
        },
      )

      await prisma.service.update({
        where: { id: service.id },
        data: { imageUrl: blob.url },
      })
      console.log(`Migrated ${catalogService.slug}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
