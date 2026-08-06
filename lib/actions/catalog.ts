'use server'

import { del } from '@vercel/blob'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod/v4'
import { env } from '@/lib/core/env'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'

const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i)

const optionalText = z.preprocess(
  value => (typeof value === 'string' && value.trim() ? value.trim() : null),
  z.string().nullable(),
)

const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: optionalText,
  color: colorSchema,
  sortOrder: z.coerce.number().int().min(0).max(1000),
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
  sortOrder: z.coerce.number().int().min(0).max(1000),
})

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
  revalidatePath('/')
  revalidatePath('/admin/services')
}

export const createCategory = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const data = categorySchema.parse(Object.fromEntries(formData))
  await prisma.serviceCategory.create({
    data: { ...data, slug: await uniqueCategorySlug(data.name) },
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
  const service = await prisma.service.create({
    data: { ...data, slug: await uniqueServiceSlug(data.name) },
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
