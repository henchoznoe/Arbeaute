'use server'

import { del } from '@vercel/blob'
import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod/v4'
import { writeAuditEvent } from '@/lib/admin/audit'
import { env } from '@/lib/core/env'
import prisma from '@/lib/core/prisma'
import { getAdminSession, setCustomerSession } from '@/lib/core/session-cookies'
import { notifyAppointmentConfirmed } from '@/lib/email/notifications'
import {
  formatInstallmentChoice,
  getPackageExpiry,
  isInstallmentCount,
} from '@/lib/packages/domain'
import {
  PackagePurchaseError,
  purchasePackageWithFirstAppointment,
} from '@/lib/packages/purchase'
import { PACKAGES_TAG } from '@/lib/packages/queries'
import { createAppointmentCalendar } from '@/lib/reservation/calendar'
import { normalizeEmail, normalizePhone } from '@/lib/reservation/identity'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import {
  formatAppointmentDate,
  getLocalDayBounds,
} from '@/lib/reservation/time'
import { checkRateLimit } from '@/lib/services/rate-limit'
import { formatPrice } from '@/lib/utils/format'
import { getRequestIp, hasSameOrigin } from '@/lib/utils/request'

const optionalText = z.preprocess(
  value => (typeof value === 'string' && value.trim() ? value.trim() : null),
  z.string().nullable(),
)

const packageSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: optionalText,
  priceChf: z.coerce.number().min(0).max(100_000),
  sessionCount: z.coerce.number().int().min(1).max(100),
  validityMonths: z.coerce.number().int().min(1).max(60),
  serviceIds: z.array(z.string().min(1)).min(1),
})

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')

const uniqueSlug = async (
  name: string,
  excludeId?: string,
): Promise<string> => {
  const base = slugify(name) || 'forfait'
  let slug = base
  let suffix = 2
  while (
    await prisma.package.findFirst({
      where: { slug, id: excludeId ? { not: excludeId } : undefined },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix}`
    suffix += 1
  }
  return slug
}

const requireAdmin = async () => {
  if (!(await getAdminSession()) || !(await hasSameOrigin()))
    redirect('/admin/login')
}

const refreshPackages = () => {
  updateTag(PACKAGES_TAG)
  revalidatePath('/forfaits')
  revalidatePath('/admin/packages')
  revalidatePath('/admin/a-traiter')
}

const parsePackageForm = (formData: FormData) => {
  const parsed = packageSchema.parse({
    ...Object.fromEntries(formData),
    serviceIds: formData.getAll('serviceIds'),
  })
  return {
    ...parsed,
    priceCents: Math.round(parsed.priceChf * 100),
    isVisible: formData.get('isVisible') === 'on',
  }
}

export const createPackage = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const {
    priceChf: _priceChf,
    serviceIds,
    ...data
  } = parsePackageForm(formData)
  const last = await prisma.package.aggregate({ _max: { sortOrder: true } })
  const slug = await uniqueSlug(data.name)
  const created = await prisma.$transaction(async transaction => {
    const item = await transaction.package.create({
      data: {
        ...data,
        slug,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        services: {
          create: serviceIds.map((serviceId, sortOrder) => ({
            serviceId,
            sortOrder,
          })),
        },
      },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'PACKAGE',
      entityId: item.id,
      entityLabel: item.name,
      action: 'CREATED',
      after: { ...data, serviceIds: serviceIds.join(',') },
    })
    return item
  })
  refreshPackages()
  redirect(`/admin/packages/${created.id}?saved=1`)
}

export const updatePackage = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const {
    priceChf: _priceChf,
    serviceIds,
    ...data
  } = parsePackageForm(formData)
  await prisma.$transaction(async transaction => {
    const before = await transaction.package.findUniqueOrThrow({
      where: { id },
      include: { services: true },
    })
    const after = await transaction.package.update({
      where: { id },
      data: {
        ...data,
        services: {
          deleteMany: {},
          create: serviceIds.map((serviceId, sortOrder) => ({
            serviceId,
            sortOrder,
          })),
        },
      },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'PACKAGE',
      entityId: id,
      entityLabel: after.name,
      action: 'UPDATED',
      before: {
        name: before.name,
        priceCents: before.priceCents,
        sessionCount: before.sessionCount,
        serviceIds: before.services.map(service => service.serviceId).join(','),
      },
      after: { ...data, serviceIds: serviceIds.join(',') },
    })
  })
  refreshPackages()
  redirect(`/admin/packages/${id}?saved=1`)
}

export const togglePackageArchive = async (formData: FormData) => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const isArchived = formData.get('archive') === '1'
  await prisma.$transaction(async transaction => {
    const before = await transaction.package.findUniqueOrThrow({
      where: { id },
    })
    await transaction.package.update({ where: { id }, data: { isArchived } })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'PACKAGE',
      entityId: id,
      entityLabel: before.name,
      action: isArchived ? 'ARCHIVED' : 'RESTORED',
      before: { isArchived: before.isArchived },
      after: { isArchived },
    })
  })
  refreshPackages()
}

export const movePackage = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const direction = z.enum(['up', 'down']).parse(formData.get('direction'))
  const items = await prisma.package.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, sortOrder: true },
  })
  const index = items.findIndex(item => item.id === id)
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  const current = items[index]
  const other = items[swapIndex]
  if (!current || !other) return
  await prisma.$transaction(async transaction => {
    await transaction.package.update({
      where: { id: current.id },
      data: { sortOrder: other.sortOrder },
    })
    await transaction.package.update({
      where: { id: other.id },
      data: { sortOrder: current.sortOrder },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'PACKAGE',
      entityId: current.id,
      entityLabel: current.name,
      action: 'REORDERED',
      before: { sortOrder: current.sortOrder },
      after: { sortOrder: other.sortOrder },
    })
  })
  refreshPackages()
}

const isBlobUrl = (value: string): boolean => {
  try {
    return new URL(value).hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

export const assignPackageImage = async (
  packageId: string,
  imageUrl: string,
): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(packageId)
  const url = z.url().parse(imageUrl)
  if (!isBlobUrl(url)) throw new Error('Invalid Blob URL')
  const previous = await prisma.package.findUniqueOrThrow({ where: { id } })
  await prisma.$transaction(async transaction => {
    await transaction.package.update({ where: { id }, data: { imageUrl: url } })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'PACKAGE',
      entityId: id,
      entityLabel: previous.name,
      action: 'FILE_ASSIGNED',
      before: { imageUrl: previous.imageUrl },
      after: { imageUrl: url },
    })
  })
  if (
    previous.imageUrl &&
    previous.imageUrl !== url &&
    isBlobUrl(previous.imageUrl)
  )
    await del(previous.imageUrl, { storeId: env.BLOB_STORE_ID })
  refreshPackages()
}

export const removePackageImage = async (formData: FormData): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const previous = await prisma.package.findUniqueOrThrow({ where: { id } })
  await prisma.$transaction(async transaction => {
    await transaction.package.update({
      where: { id },
      data: { imageUrl: null },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'PACKAGE',
      entityId: id,
      entityLabel: previous.name,
      action: 'FILE_REMOVED',
      before: { imageUrl: previous.imageUrl },
      after: { imageUrl: null },
    })
  })
  if (previous.imageUrl && isBlobUrl(previous.imageUrl))
    await del(previous.imageUrl, { storeId: env.BLOB_STORE_ID })
  refreshPackages()
}

export interface PackageBookingResult {
  ok: boolean
  message: string
  reason?: 'INVALID_CUSTOMER' | 'SLOT_CONFLICT' | 'UNKNOWN'
  appointment?: {
    serviceLabel: string
    packageLabel: string
    dateLabel: string
    priceLabel: string
    installmentLabel: string
    startsAt: string
    endsAt: string
    calendar: string
    confirmationEmailTo: string | null
  }
}

const optionalBookingText = (maxLength: number) =>
  z.preprocess(
    value => (value === null || value === '' ? undefined : value),
    z.string().trim().max(maxLength).optional(),
  )

const publicPackageSchema = z.object({
  packageId: z.string().min(1),
  serviceId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }),
  installmentCount: z.coerce.number().int(),
  firstName: optionalBookingText(100),
  lastName: optionalBookingText(100),
  email: z.string().trim().min(1).max(254),
  phone: optionalBookingText(40),
  comment: optionalBookingText(1000),
  consent: z.literal(true),
  website: optionalBookingText(0),
})

const packageBookingError = (): PackageBookingResult => ({
  ok: false,
  reason: 'UNKNOWN',
  message:
    'Le forfait n’a pas pu être réservé. Vérifiez vos informations et le créneau choisi.',
})

export const createPublicPackageBooking = async (
  input: unknown,
): Promise<PackageBookingResult> => {
  if (!(await hasSameOrigin())) return packageBookingError()
  const parsed = publicPackageSchema.safeParse(input)
  if (!parsed.success || !isInstallmentCount(parsed.data.installmentCount))
    return packageBookingError()
  try {
    const email = normalizeEmail(parsed.data.email)
    const known = await prisma.customer.findFirst({
      where: { emailNormalized: email, anonymizedAt: null },
      select: { firstName: true, lastName: true, phone: true },
    })
    const lastName = parsed.data.lastName?.trim() || known?.lastName
    const firstName = parsed.data.firstName?.trim() || known?.firstName || null
    const rawPhone = parsed.data.phone?.trim() || known?.phone
    if (!lastName || !rawPhone)
      return {
        ok: false,
        reason: 'INVALID_CUSTOMER',
        message: 'Certaines coordonnées ne sont pas valides.',
      }
    const phone = normalizePhone(rawPhone)
    const ip = await getRequestIp()
    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit({
        action: 'public-package-ip',
        key: ip,
        limit: 5,
        windowMs: 3_600_000,
      }),
      checkRateLimit({
        action: 'public-package-email',
        key: email,
        limit: 5,
        windowMs: 3_600_000,
      }),
    ])
    if (!ipLimit.allowed || !emailLimit.allowed) return packageBookingError()
    const result = await purchasePackageWithFirstAppointment(prisma, {
      packageId: parsed.data.packageId,
      serviceId: parsed.data.serviceId,
      startsAt: new Date(parsed.data.startsAt),
      installmentCount: parsed.data.installmentCount,
      firstName,
      lastName,
      email,
      phone,
      comment: parsed.data.comment || null,
    })
    await setCustomerSession(
      result.customer.id,
      result.customer.identityVersion,
    )
    const confirmationEmailTo = notifyAppointmentConfirmed({
      ...result.appointment,
      package: {
        name: result.customerPackage.packageNameSnapshot,
        priceCents: result.customerPackage.packagePriceCents,
        sessionCount: result.customerPackage.sessionCountSnapshot,
        installmentCount: result.customerPackage.installmentCount,
      },
    })
    revalidatePath('/admin')
    revalidatePath('/admin/a-traiter')
    return {
      ok: true,
      message: 'Votre forfait et votre premier rendez-vous sont confirmés.',
      appointment: {
        serviceLabel: formatServiceLabel(
          result.appointment.serviceNameSnapshot,
          result.appointment.categoryName,
        ),
        packageLabel: result.customerPackage.packageNameSnapshot,
        dateLabel: formatAppointmentDate(result.appointment.startsAt),
        priceLabel: formatPrice(result.customerPackage.packagePriceCents),
        installmentLabel: formatInstallmentChoice(
          result.customerPackage.installmentCount,
        ),
        startsAt: result.appointment.startsAt.toISOString(),
        endsAt: result.appointment.endsAt.toISOString(),
        calendar: createAppointmentCalendar({
          id: result.appointment.id,
          serviceLabel: result.customerPackage.packageNameSnapshot,
          startsAt: result.appointment.startsAt,
          endsAt: result.appointment.endsAt,
        }),
        confirmationEmailTo,
      },
    }
  } catch (error) {
    if (error instanceof PackagePurchaseError)
      return {
        ok: false,
        reason: 'SLOT_CONFLICT',
        message:
          'Ce créneau ou ce forfait n’est plus disponible. Choisissez-en un autre.',
      }
    return packageBookingError()
  }
}

export const openCustomerPackage = async (
  formData: FormData,
): Promise<void> => {
  await requireAdmin()
  const packageId = z.string().min(1).parse(formData.get('packageId'))
  const customerId = z.string().min(1).parse(formData.get('customerId'))
  const installmentCount = z.coerce
    .number()
    .int()
    .parse(formData.get('installmentCount'))
  if (!isInstallmentCount(installmentCount))
    throw new Error('INVALID_INSTALLMENTS')
  const offeredPackage = await prisma.package.findFirstOrThrow({
    where: { id: packageId, isArchived: false },
    include: { services: true },
  })
  const created = await prisma.$transaction(async transaction => {
    const item = await transaction.customerPackage.create({
      data: {
        packageId,
        customerId,
        packageNameSnapshot: offeredPackage.name,
        packagePriceCents: offeredPackage.priceCents,
        sessionCountSnapshot: offeredPackage.sessionCount,
        validityMonthsSnapshot: offeredPackage.validityMonths,
        installmentCount,
        allowedServices: {
          create: offeredPackage.services.map(item => ({
            serviceId: item.serviceId,
          })),
        },
      },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'CUSTOMER_PACKAGE',
      entityId: item.id,
      entityLabel: item.packageNameSnapshot,
      action: 'CREATED',
      after: { packageId, customerId, installmentCount },
    })
    return item
  })
  revalidatePath(`/admin/customers/${customerId}`)
  redirect(`/admin/customer-packages/${created.id}`)
}

export const decidePackageCredit = async (
  formData: FormData,
): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('sessionId'))
  const creditState = z
    .enum(['COUNTED', 'RETURNED'])
    .parse(formData.get('decision'))
  await prisma.$transaction(
    async transaction => {
      const session = await transaction.packageSession.findUniqueOrThrow({
        where: { id },
        include: { customerPackage: true, appointment: true },
      })
      await transaction.packageSession.update({
        where: { id },
        data: { creditState },
      })
      if (
        creditState === 'RETURNED' &&
        session.customerPackage.revenueAppointmentId === session.appointmentId
      ) {
        const next = await transaction.packageSession.findFirst({
          where: {
            customerPackageId: session.customerPackageId,
            id: { not: id },
            creditState: { not: 'RETURNED' },
          },
          include: { appointment: true },
          orderBy: { appointment: { startsAt: 'asc' } },
        })
        await transaction.customerPackage.update({
          where: { id: session.customerPackageId },
          data: {
            revenueAppointmentId: next?.appointmentId ?? null,
            validityStartsAt: next?.appointment.startsAt ?? null,
          },
        })
      }
      await writeAuditEvent(transaction, {
        actorType: 'ADMIN',
        actorId: 'admin',
        entityType: 'CUSTOMER_PACKAGE',
        entityId: session.customerPackageId,
        entityLabel: session.customerPackage.packageNameSnapshot,
        action: 'UPDATED',
        before: { creditState: session.creditState },
        after: { creditState, appointmentId: session.appointmentId },
      })
    },
    { isolationLevel: 'Serializable' },
  )
  refreshPackages()
}

export const updateCustomerPackageInstallments = async (
  formData: FormData,
): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const installmentCount = z.coerce
    .number()
    .int()
    .parse(formData.get('installmentCount'))
  if (!isInstallmentCount(installmentCount))
    throw new Error('INVALID_INSTALLMENTS')
  const before = await prisma.customerPackage.findUniqueOrThrow({
    where: { id },
  })
  await prisma.$transaction(async transaction => {
    await transaction.customerPackage.update({
      where: { id },
      data: { installmentCount },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'CUSTOMER_PACKAGE',
      entityId: id,
      entityLabel: before.packageNameSnapshot,
      action: 'UPDATED',
      before: { installmentCount: before.installmentCount },
      after: { installmentCount },
    })
  })
  refreshPackages()
}

export const cancelCustomerPackage = async (
  formData: FormData,
): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  await prisma.$transaction(async transaction => {
    const item = await transaction.customerPackage.findUniqueOrThrow({
      where: { id },
      include: {
        sessions: {
          include: { appointment: true },
        },
      },
    })
    if (
      item.sessions.some(
        session =>
          session.appointment.status === 'CONFIRMED' &&
          session.appointment.startsAt > new Date(),
      )
    )
      throw new Error('PACKAGE_HAS_FUTURE_APPOINTMENTS')
    await transaction.customerPackage.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'CUSTOMER_PACKAGE',
      entityId: id,
      entityLabel: item.packageNameSnapshot,
      action: 'CANCELLED',
      before: { status: item.status },
      after: { status: 'CANCELLED' },
    })
  })
  refreshPackages()
}

export const extendCustomerPackage = async (
  formData: FormData,
): Promise<void> => {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const date = z.iso.date().parse(formData.get('expiresOn'))
  const before = await prisma.customerPackage.findUniqueOrThrow({
    where: { id },
  })
  const expiresAtOverride = new Date(getLocalDayBounds(date).end.getTime() - 1)
  await prisma.$transaction(async transaction => {
    await transaction.customerPackage.update({
      where: { id },
      data: { expiresAtOverride },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'CUSTOMER_PACKAGE',
      entityId: id,
      entityLabel: before.packageNameSnapshot,
      action: 'UPDATED',
      before: {
        expiresAt:
          getPackageExpiry({
            validityStartsAt: before.validityStartsAt,
            validityMonths: before.validityMonthsSnapshot,
            expiresAtOverride: before.expiresAtOverride,
          })?.toISOString() ?? null,
      },
      after: { expiresAt: expiresAtOverride.toISOString() },
    })
  })
  refreshPackages()
}

export const attachAppointmentsToPackage = async (
  formData: FormData,
): Promise<void> => {
  await requireAdmin()
  const customerPackageId = z
    .string()
    .min(1)
    .parse(formData.get('customerPackageId'))
  const appointmentIds = z
    .array(z.string().min(1))
    .min(1)
    .parse(formData.getAll('appointmentId'))
  await prisma.$transaction(
    async transaction => {
      const [item, appointments] = await Promise.all([
        transaction.customerPackage.findUniqueOrThrow({
          where: { id: customerPackageId },
          include: { allowedServices: true, sessions: true },
        }),
        transaction.appointment.findMany({
          where: { id: { in: appointmentIds } },
          orderBy: { startsAt: 'asc' },
        }),
      ])
      if (appointments.length !== new Set(appointmentIds).size)
        throw new Error('PACKAGE_APPOINTMENT_NOT_FOUND')
      const used = item.sessions.filter(
        session => session.creditState !== 'RETURNED',
      ).length
      const expiry = getPackageExpiry({
        validityStartsAt: item.validityStartsAt,
        validityMonths: item.validityMonthsSnapshot,
        expiresAtOverride: item.expiresAtOverride,
      })
      if (
        item.status !== 'ACTIVE' ||
        used + appointments.length > item.sessionCountSnapshot ||
        appointments.some(
          appointment =>
            item.customerId !== appointment.customerId ||
            !item.allowedServices.some(
              service => service.serviceId === appointment.serviceId,
            ) ||
            (expiry && appointment.startsAt > expiry),
        )
      )
        throw new Error('PACKAGE_APPOINTMENT_NOT_ALLOWED')
      await transaction.packageSession.createMany({
        data: appointments.map(appointment => ({
          customerPackageId,
          appointmentId: appointment.id,
        })),
      })
      const first = appointments[0]
      await transaction.customerPackage.update({
        where: { id: customerPackageId },
        data: {
          validityStartsAt: item.validityStartsAt ?? first?.startsAt,
          revenueAppointmentId: item.revenueAppointmentId ?? first?.id,
        },
      })
      await writeAuditEvent(transaction, {
        actorType: 'ADMIN',
        actorId: 'admin',
        entityType: 'CUSTOMER_PACKAGE',
        entityId: item.id,
        entityLabel: item.packageNameSnapshot,
        action: 'UPDATED',
        after: {
          appointmentIds: appointments
            .map(appointment => appointment.id)
            .join(','),
          sessionsAttached: appointments.length,
        },
      })
    },
    { isolationLevel: 'Serializable' },
  )
  refreshPackages()
}
