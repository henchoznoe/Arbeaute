import { appointmentAuditValues, writeAuditEvent } from '@/lib/admin/audit'
import { getAvailableSlots } from '@/lib/reservation/availability'
import { getBookingSettings } from '@/lib/reservation/booking-settings'
import { MAX_SERIALIZABLE_ATTEMPTS } from '@/lib/reservation/constants'
import {
  normalizeCustomerSearchName,
  upsertCustomerIdentity,
} from '@/lib/reservation/customers'
import { getLocalDateKey } from '@/lib/reservation/time'
import { Prisma, type PrismaClient } from '@/prisma/generated/prisma/client'
import type { InstallmentCount } from './domain'

export class PackagePurchaseError extends Error {
  constructor(
    public readonly code:
      | 'PACKAGE_UNAVAILABLE'
      | 'SERVICE_NOT_ALLOWED'
      | 'SLOT_UNAVAILABLE',
  ) {
    super(code)
  }
}

interface PackagePurchaseInput {
  packageId: string
  serviceId: string
  startsAt: Date
  installmentCount: InstallmentCount
  firstName: string | null
  lastName: string
  email: string
  phone: string
  comment: string | null
}

const shouldRetry = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2034'

export const purchasePackageWithFirstAppointment = async (
  prisma: PrismaClient,
  input: PackagePurchaseInput,
) => {
  const settings = await getBookingSettings()
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async transaction => {
          const offeredPackage = await transaction.package.findFirst({
            where: {
              id: input.packageId,
              isVisible: true,
              isArchived: false,
            },
            include: {
              services: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  service: {
                    include: {
                      category: { select: { name: true, isActive: true } },
                    },
                  },
                },
              },
            },
          })
          if (!offeredPackage)
            throw new PackagePurchaseError('PACKAGE_UNAVAILABLE')
          const selected = offeredPackage.services.find(
            entry => entry.serviceId === input.serviceId,
          )?.service
          if (
            !selected?.isBookable ||
            !selected.isVisible ||
            selected.isArchived ||
            !selected.category?.isActive
          )
            throw new PackagePurchaseError('SERVICE_NOT_ALLOWED')

          const slots = await getAvailableSlots({
            database: transaction,
            serviceId: selected.id,
            dateKey: getLocalDateKey(input.startsAt),
            settings,
          })
          if (
            !slots.some(
              slot =>
                slot.startsAt === input.startsAt.toISOString() &&
                slot.state === 'OPEN',
            )
          )
            throw new PackagePurchaseError('SLOT_UNAVAILABLE')

          const customer = await upsertCustomerIdentity(transaction, {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
          })
          const appointment = await transaction.appointment.create({
            data: {
              serviceId: selected.id,
              customerId: customer.id,
              serviceNameSnapshot: selected.name,
              servicePriceCents: selected.priceCents,
              serviceDurationMinutes: selected.durationMinutes,
              preparationMinutes: selected.preparationMinutes,
              cleanupMinutes: selected.cleanupMinutes,
              startsAt: input.startsAt,
              endsAt: new Date(
                input.startsAt.getTime() + selected.durationMinutes * 60_000,
              ),
              occupiedStartsAt: new Date(
                input.startsAt.getTime() - selected.preparationMinutes * 60_000,
              ),
              occupiedEndsAt: new Date(
                input.startsAt.getTime() +
                  (selected.durationMinutes + selected.cleanupMinutes) * 60_000,
              ),
              customerFirstName: input.firstName,
              customerLastName: input.lastName,
              customerSearchName: normalizeCustomerSearchName(
                input.firstName,
                input.lastName,
              ),
              customerEmail: input.email,
              customerPhone: input.phone,
              comment: input.comment,
              source: 'PUBLIC',
              status: 'CONFIRMED',
            },
          })
          const customerPackage = await transaction.customerPackage.create({
            data: {
              packageId: offeredPackage.id,
              customerId: customer.id,
              packageNameSnapshot: offeredPackage.name,
              packagePriceCents: offeredPackage.priceCents,
              sessionCountSnapshot: offeredPackage.sessionCount,
              validityMonthsSnapshot: offeredPackage.validityMonths,
              installmentCount: input.installmentCount,
              validityStartsAt: input.startsAt,
              revenueAppointmentId: appointment.id,
              allowedServices: {
                create: offeredPackage.services.map(entry => ({
                  serviceId: entry.serviceId,
                })),
              },
            },
          })
          await transaction.packageSession.create({
            data: {
              customerPackageId: customerPackage.id,
              appointmentId: appointment.id,
            },
          })
          const activity = await transaction.appointmentActivity.create({
            data: {
              type: 'CREATED',
              appointmentId: appointment.id,
              customerFirstNameSnapshot: appointment.customerFirstName,
              customerLastNameSnapshot: appointment.customerLastName,
              serviceNameSnapshot: appointment.serviceNameSnapshot,
              appointmentStartsAt: appointment.startsAt,
            },
          })
          await writeAuditEvent(transaction, {
            actorType: 'CUSTOMER',
            actorId: customer.id,
            entityType: 'CUSTOMER_PACKAGE',
            entityId: customerPackage.id,
            entityLabel: customerPackage.packageNameSnapshot,
            action: 'CREATED',
            after: {
              packageId: offeredPackage.id,
              installmentCount: input.installmentCount,
              appointmentId: appointment.id,
              ...appointmentAuditValues(appointment),
              activityId: activity.id,
            },
          })
          return {
            appointment: {
              ...appointment,
              categoryName: selected.category?.name ?? null,
            },
            customer,
            customerPackage,
          }
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (error) {
      if (error instanceof PackagePurchaseError) throw error
      if (!shouldRetry(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS)
        throw error
    }
  }
  throw new PackagePurchaseError('SLOT_UNAVAILABLE')
}
