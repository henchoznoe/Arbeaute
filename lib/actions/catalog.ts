'use server'

import { del } from '@vercel/blob'
import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod/v4'
import { CATALOG_TAG } from '@/lib/catalog/queries'
import { env } from '@/lib/core/env'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { Prisma } from '@/prisma/generated/prisma/client'

const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i)

const optionalText = z.preprocess(
  value => (typeof value === 'string' && value.trim() ? value.trim() : null),
  z.string().nullable(),
)

const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: optionalText,
  color: colorSchema,
})

const serviceSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(150),
  description: optionalText,
  durationMinutes: z.coerce.number().int().min(1).max(720),
  preparationMinutes: z.coerce.number().int().min(0).max(240),
  cleanupMinutes: z.coerce.number().int().min(0).max(240),
  priceChf: z.coerce.number().min(0).max(100_000),
  priceNote: optionalText,
  color: colorSchema,
})

const isForeignKeyRestriction = (error: unknown): boolean => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2003'
  )
    return true
  return error instanceof Error && /foreign key|restrict/i.test(error.message)
}

const moveDirectionSchema = z.enum(['up', 'down'])

const reorderIds = (
  ids: string[],
  id: string,
  direction: 'up' | 'down',
): [string, string] | null => {
  const index = ids.indexOf(id)
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || swapIndex < 0 || swapIndex >= ids.length) return null
  return [ids[index], ids[swapIndex]]
}

const requireAdmin = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
}

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')

const uniqueCategorySlug = async (name: string): Promise<string> => {
  const base = slugify(name) || 'groupe'
  let slug = base
  let suffix = 2
  while (await prisma.serviceCategory.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`
    suffix += 1
  }
  return slug
}

const uniqueServiceSlug = async (name: string): Promise<string> => {
  const base = slugify(name) || 'prestation'
  let slug = base
  let suffix = 2
  while (await prisma.service.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`
    suffix += 1
  }
  return slug
}

const refreshCatalog = () => {
  // `updateTag` expire le catalogue mis en cache : la page d'accueil et le
  // tunnel de réservation reflètent la modification dès la requête suivante.
  updateTag(CATALOG_TAG)
  revalidatePath('/admin/services')
}

export const createCategory = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const data = categorySchema.parse(Object.fromEntries(formData))
  const last = await prisma.serviceCategory.aggregate({
    _max: { sortOrder: true },
  })
  await prisma.serviceCategory.create({
    data: {
      ...data,
      sortOrder: (last._max.sortOrder ?? -1) + 1,
      slug: await uniqueCategorySlug(data.name),
    },
  })
  refreshCatalog()
}

export const updateCategory = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const data = categorySchema.parse(Object.fromEntries(formData))
  await prisma.serviceCategory.update({ where: { id }, data })
  refreshCatalog()
}

export const toggleCategory = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const category = await prisma.serviceCategory.findUniqueOrThrow({
    where: { id },
    select: { isActive: true },
  })
  await prisma.serviceCategory.update({
    where: { id },
    data: { isActive: !category.isActive },
  })
  refreshCatalog()
}

export const moveCategory = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const direction = moveDirectionSchema.parse(formData.get('direction'))
  const categories = await prisma.serviceCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, sortOrder: true },
  })
  const pair = reorderIds(
    categories.map(category => category.id),
    id,
    direction,
  )
  if (!pair) return
  const [currentId, siblingId] = pair
  const current = categories.find(category => category.id === currentId)
  const sibling = categories.find(category => category.id === siblingId)
  if (!current || !sibling) return
  await prisma.$transaction([
    prisma.serviceCategory.update({
      where: { id: current.id },
      data: { sortOrder: sibling.sortOrder },
    }),
    prisma.serviceCategory.update({
      where: { id: sibling.id },
      data: { sortOrder: current.sortOrder },
    }),
  ])
  refreshCatalog()
}

const parseServiceForm = (formData: FormData) => {
  const data = serviceSchema.parse(Object.fromEntries(formData))
  return {
    ...data,
    priceCents: Math.round(data.priceChf * 100),
    isBookable: formData.get('isBookable') === 'on',
    isVisible: formData.get('isVisible') === 'on',
  }
}

export const createService = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const { priceChf: _priceChf, ...data } = parseServiceForm(formData)
  const last = await prisma.service.aggregate({
    where: { categoryId: data.categoryId },
    _max: { sortOrder: true },
  })
  const service = await prisma.service.create({
    data: {
      ...data,
      sortOrder: (last._max.sortOrder ?? -1) + 1,
      slug: await uniqueServiceSlug(data.name),
    },
    select: { id: true },
  })
  refreshCatalog()
  redirect(`/admin/services/${service.id}`)
}

export const updateService = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const { priceChf: _priceChf, ...data } = parseServiceForm(formData)
  await prisma.service.update({ where: { id }, data })
  refreshCatalog()
  redirect(`/admin/services/${id}?saved=1`)
}

export const duplicateService = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const source = await prisma.service.findUniqueOrThrow({ where: { id } })
  const {
    id: _id,
    agendaSourceId: _agendaSourceId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...copy
  } = source
  const name = `${source.name} — copie`
  const duplicate = await prisma.service.create({
    data: {
      ...copy,
      name,
      slug: await uniqueServiceSlug(name),
      imageUrl: source.imageUrl,
      isArchived: false,
    },
    select: { id: true },
  })
  refreshCatalog()
  redirect(`/admin/services/${duplicate.id}`)
}

export const toggleServiceArchive = async (
  formData: FormData,
): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const service = await prisma.service.findUniqueOrThrow({
    where: { id },
    select: { isArchived: true },
  })
  await prisma.service.update({
    where: { id },
    data: { isArchived: !service.isArchived },
  })
  refreshCatalog()
}

export const moveService = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const direction = moveDirectionSchema.parse(formData.get('direction'))
  const service = await prisma.service.findUniqueOrThrow({
    where: { id },
    select: { categoryId: true },
  })
  const siblings = await prisma.service.findMany({
    where: { categoryId: service.categoryId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, sortOrder: true },
  })
  const pair = reorderIds(
    siblings.map(sibling => sibling.id),
    id,
    direction,
  )
  if (!pair) return
  const [currentId, siblingId] = pair
  const current = siblings.find(sibling => sibling.id === currentId)
  const sibling = siblings.find(sibling => sibling.id === siblingId)
  if (!current || !sibling) return
  await prisma.$transaction([
    prisma.service.update({
      where: { id: current.id },
      data: { sortOrder: sibling.sortOrder },
    }),
    prisma.service.update({
      where: { id: sibling.id },
      data: { sortOrder: current.sortOrder },
    }),
  ])
  refreshCatalog()
}

export const deleteService = async (
  serviceId: string,
): Promise<{ ok: boolean; message: string }> => {
  await requireAdmin()
  const id = z.string().min(1).parse(serviceId)
  const service = await prisma.service.findUnique({
    where: { id },
    select: { imageUrl: true },
  })
  if (!service) return { ok: false, message: 'Prestation introuvable.' }

  try {
    await prisma.service.delete({ where: { id } })
  } catch (error) {
    if (isForeignKeyRestriction(error))
      return {
        ok: false,
        message:
          'Impossible de supprimer : cette prestation a déjà été réservée au moins une fois. Archivez-la plutôt pour la retirer sans perdre l’historique des rendez-vous.',
      }
    return { ok: false, message: 'La suppression a échoué. Réessayez.' }
  }

  if (service.imageUrl) await deleteBlobIfOrphan(service.imageUrl)
  refreshCatalog()
  return { ok: true, message: 'Prestation supprimée.' }
}

const isBlobUrl = (value: string): boolean => {
  try {
    return new URL(value).hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

const deleteBlobIfOrphan = async (imageUrl: string): Promise<void> => {
  if (!isBlobUrl(imageUrl)) return
  const references = await prisma.service.count({ where: { imageUrl } })
  if (references === 0) await del(imageUrl, { storeId: env.BLOB_STORE_ID })
}

const deleteConsentBlobIfOrphan = async (fileUrl: string): Promise<void> => {
  if (!isBlobUrl(fileUrl)) return
  const references = await prisma.service.count({
    where: { consentFormUrl: fileUrl },
  })
  if (references === 0) await del(fileUrl, { storeId: env.BLOB_STORE_ID })
}

export const assignServiceImage = async (
  serviceId: string,
  imageUrl: string,
): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(serviceId)
  const url = z.url().parse(imageUrl)
  if (!isBlobUrl(url)) throw new Error('Invalid Blob URL')

  const previous = await prisma.service.findUniqueOrThrow({
    where: { id },
    select: { imageUrl: true },
  })
  await prisma.service.update({ where: { id }, data: { imageUrl: url } })

  if (previous.imageUrl && previous.imageUrl !== url)
    await deleteBlobIfOrphan(previous.imageUrl)
  refreshCatalog()
}

export const assignServiceConsentForm = async (
  serviceId: string,
  fileUrl: string,
): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(serviceId)
  const url = z.url().parse(fileUrl)
  if (!isBlobUrl(url)) throw new Error('Invalid Blob URL')

  const previous = await prisma.service.findUniqueOrThrow({
    where: { id },
    select: { consentFormUrl: true },
  })
  await prisma.service.update({
    where: { id },
    data: { consentFormUrl: url },
  })

  if (previous.consentFormUrl && previous.consentFormUrl !== url)
    await deleteConsentBlobIfOrphan(previous.consentFormUrl)
  refreshCatalog()
}

export const removeServiceConsentForm = async (
  formData: FormData,
): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const service = await prisma.service.findUniqueOrThrow({
    where: { id },
    select: { consentFormUrl: true },
  })
  await prisma.service.update({
    where: { id },
    data: { consentFormUrl: null },
  })
  if (service.consentFormUrl)
    await deleteConsentBlobIfOrphan(service.consentFormUrl)
  refreshCatalog()
}

export const removeServiceImage = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const service = await prisma.service.findUniqueOrThrow({
    where: { id },
    select: { imageUrl: true },
  })
  await prisma.service.update({ where: { id }, data: { imageUrl: null } })
  if (service.imageUrl) await deleteBlobIfOrphan(service.imageUrl)
  refreshCatalog()
}
