'use server'

import { del } from '@vercel/blob'
import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod/v4'
import { runAuditedMutation, writeAuditEvent } from '@/lib/admin/audit'
import { CATALOG_TAG } from '@/lib/catalog/queries'
import { env } from '@/lib/core/env'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { hasSameOrigin } from '@/lib/utils/request'
import { Prisma } from '@/prisma/generated/prisma/client'

const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i)

const optionalText = z.preprocess(
  value => (typeof value === 'string' && value.trim() ? value.trim() : null),
  z.string().nullable(),
)

const optionalTextWithMax = (max: number) =>
  z.preprocess(
    value => (typeof value === 'string' && value.trim() ? value.trim() : null),
    z.string().max(max).nullable(),
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
  preparationAdvice: optionalTextWithMax(2000),
  contraindications: optionalTextWithMax(2000),
  expectedResults: optionalTextWithMax(2000),
  aftercareAdvice: optionalTextWithMax(2000),
  faqQuestion1: optionalTextWithMax(200),
  faqAnswer1: optionalTextWithMax(1000),
  faqQuestion2: optionalTextWithMax(200),
  faqAnswer2: optionalTextWithMax(1000),
  faqQuestion3: optionalTextWithMax(200),
  faqAnswer3: optionalTextWithMax(1000),
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
  if (!(await getAdminSession()) || !(await hasSameOrigin()))
    redirect('/admin/login')
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
  const slug = await uniqueCategorySlug(data.name)
  await runAuditedMutation(
    prisma,
    transaction =>
      transaction.serviceCategory.create({
        data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1, slug },
      }),
    created => ({
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE_CATEGORY',
      entityId: created.id,
      entityLabel: created.name,
      action: 'CREATED',
      after: { name: created.name, color: created.color },
    }),
  )
  refreshCatalog()
}

export const updateCategory = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const data = categorySchema.parse(Object.fromEntries(formData))
  await prisma.$transaction(async transaction => {
    const before = await transaction.serviceCategory.findUniqueOrThrow({
      where: { id },
    })
    const after = await transaction.serviceCategory.update({
      where: { id },
      data,
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE_CATEGORY',
      entityId: after.id,
      entityLabel: after.name,
      action: 'UPDATED',
      before: { name: before.name, color: before.color },
      after: { name: after.name, color: after.color },
    })
  })
  refreshCatalog()
}

export const toggleCategory = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  await prisma.$transaction(async transaction => {
    const category = await transaction.serviceCategory.findUniqueOrThrow({
      where: { id },
      select: { id: true, name: true, isActive: true },
    })
    const updated = await transaction.serviceCategory.update({
      where: { id },
      data: { isActive: !category.isActive },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE_CATEGORY',
      entityId: updated.id,
      entityLabel: updated.name,
      action: updated.isActive ? 'RESTORED' : 'ARCHIVED',
      before: { isActive: category.isActive },
      after: { isActive: updated.isActive },
    })
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
  await prisma.$transaction(async transaction => {
    await transaction.serviceCategory.update({
      where: { id: current.id },
      data: { sortOrder: sibling.sortOrder },
    })
    await transaction.serviceCategory.update({
      where: { id: sibling.id },
      data: { sortOrder: current.sortOrder },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE_CATEGORY',
      entityId: current.id,
      action: 'REORDERED',
      before: { sortOrder: current.sortOrder },
      after: { sortOrder: sibling.sortOrder },
    })
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
  const last = await prisma.service.aggregate({
    where: { categoryId: data.categoryId },
    _max: { sortOrder: true },
  })
  const slug = await uniqueServiceSlug(data.name)
  const service = await runAuditedMutation(
    prisma,
    transaction =>
      transaction.service.create({
        data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1, slug },
      }),
    created => ({
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE',
      entityId: created.id,
      entityLabel: created.name,
      action: 'CREATED',
      after: {
        categoryId: created.categoryId,
        priceCents: created.priceCents,
        durationMinutes: created.durationMinutes,
        isBookable: created.isBookable,
        isVisible: created.isVisible,
      },
    }),
  )
  refreshCatalog()
  // Créer et modifier sont deux gestes voisins : ils confirment de la même
  // façon, sans quoi l'un des deux laisse croire que rien ne s'est passé.
  redirect(`/admin/services/${service.id}?saved=1`)
}

export const updateService = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const { priceChf: _priceChf, ...data } = parseServiceForm(formData)
  await prisma.$transaction(async transaction => {
    const before = await transaction.service.findUniqueOrThrow({
      where: { id },
    })
    const after = await transaction.service.update({ where: { id }, data })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE',
      entityId: after.id,
      entityLabel: after.name,
      action: 'UPDATED',
      before: {
        name: before.name,
        categoryId: before.categoryId,
        priceCents: before.priceCents,
        durationMinutes: before.durationMinutes,
        preparationMinutes: before.preparationMinutes,
        cleanupMinutes: before.cleanupMinutes,
        isBookable: before.isBookable,
        isVisible: before.isVisible,
      },
      after: {
        name: after.name,
        categoryId: after.categoryId,
        priceCents: after.priceCents,
        durationMinutes: after.durationMinutes,
        preparationMinutes: after.preparationMinutes,
        cleanupMinutes: after.cleanupMinutes,
        isBookable: after.isBookable,
        isVisible: after.isVisible,
      },
    })
  })
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
  const slug = await uniqueServiceSlug(name)
  const duplicate = await runAuditedMutation(
    prisma,
    transaction =>
      transaction.service.create({
        data: {
          ...copy,
          name,
          slug,
          imageUrl: source.imageUrl,
          isArchived: false,
        },
      }),
    created => ({
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE',
      entityId: created.id,
      entityLabel: created.name,
      action: 'CREATED',
      after: { duplicatedFrom: source.id, name: created.name },
    }),
  )
  refreshCatalog()
  redirect(`/admin/services/${duplicate.id}`)
}

export const toggleServiceArchive = async (
  formData: FormData,
): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  await prisma.$transaction(async transaction => {
    const service = await transaction.service.findUniqueOrThrow({
      where: { id },
      select: { id: true, name: true, isArchived: true },
    })
    const updated = await transaction.service.update({
      where: { id },
      data: { isArchived: !service.isArchived },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE',
      entityId: updated.id,
      entityLabel: updated.name,
      action: updated.isArchived ? 'ARCHIVED' : 'RESTORED',
      before: { isArchived: service.isArchived },
      after: { isArchived: updated.isArchived },
    })
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
  await prisma.$transaction(async transaction => {
    await transaction.service.update({
      where: { id: current.id },
      data: { sortOrder: sibling.sortOrder },
    })
    await transaction.service.update({
      where: { id: sibling.id },
      data: { sortOrder: current.sortOrder },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE',
      entityId: current.id,
      action: 'REORDERED',
      before: { sortOrder: current.sortOrder },
      after: { sortOrder: sibling.sortOrder },
    })
  })
  refreshCatalog()
}

export const deleteService = async (
  serviceId: string,
): Promise<{ ok: boolean; message: string }> => {
  await requireAdmin()
  const id = z.string().min(1).parse(serviceId)
  const service = await prisma.service.findUnique({
    where: { id },
    select: { id: true, name: true, imageUrl: true },
  })
  if (!service)
    return {
      ok: false,
      message: 'Cette prestation n’existe plus. Revenez à la liste des soins.',
    }

  try {
    await prisma.$transaction(async transaction => {
      await transaction.service.delete({ where: { id } })
      await writeAuditEvent(transaction, {
        actorType: 'ADMIN',
        actorId: 'admin',
        entityType: 'SERVICE',
        entityId: service.id,
        entityLabel: service.name,
        action: 'DELETED',
        before: { name: service.name, hadImage: Boolean(service.imageUrl) },
      })
    })
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

  const previous = await prisma.$transaction(async transaction => {
    const service = await transaction.service.findUniqueOrThrow({
      where: { id },
      select: { id: true, name: true, imageUrl: true },
    })
    await transaction.service.update({ where: { id }, data: { imageUrl: url } })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE',
      entityId: service.id,
      entityLabel: service.name,
      action: 'FILE_ASSIGNED',
      before: { hadImage: Boolean(service.imageUrl) },
      after: { hasImage: true },
    })
    return service
  })

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

  const previous = await prisma.$transaction(async transaction => {
    const service = await transaction.service.findUniqueOrThrow({
      where: { id },
      select: { id: true, name: true, consentFormUrl: true },
    })
    await transaction.service.update({
      where: { id },
      data: { consentFormUrl: url },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE',
      entityId: service.id,
      entityLabel: service.name,
      action: 'FILE_ASSIGNED',
      before: { hadConsentForm: Boolean(service.consentFormUrl) },
      after: { hasConsentForm: true },
    })
    return service
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
  const service = await prisma.$transaction(async transaction => {
    const current = await transaction.service.findUniqueOrThrow({
      where: { id },
      select: { id: true, name: true, consentFormUrl: true },
    })
    await transaction.service.update({
      where: { id },
      data: { consentFormUrl: null },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE',
      entityId: current.id,
      entityLabel: current.name,
      action: 'FILE_REMOVED',
      before: { hadConsentForm: Boolean(current.consentFormUrl) },
      after: { hasConsentForm: false },
    })
    return current
  })
  if (service.consentFormUrl)
    await deleteConsentBlobIfOrphan(service.consentFormUrl)
  refreshCatalog()
}

export const removeServiceImage = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const service = await prisma.$transaction(async transaction => {
    const current = await transaction.service.findUniqueOrThrow({
      where: { id },
      select: { id: true, name: true, imageUrl: true },
    })
    await transaction.service.update({
      where: { id },
      data: { imageUrl: null },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'SERVICE',
      entityId: current.id,
      entityLabel: current.name,
      action: 'FILE_REMOVED',
      before: { hadImage: Boolean(current.imageUrl) },
      after: { hasImage: false },
    })
    return current
  })
  if (service.imageUrl) await deleteBlobIfOrphan(service.imageUrl)
  refreshCatalog()
}
