import { writeAuditEvent } from '@/lib/admin/audit'
import { createCustomerIdentityDigest } from '@/lib/core/session-cookies'
import { getAvailableSlots } from '@/lib/reservation/availability'
import { MAX_SERIALIZABLE_ATTEMPTS } from '@/lib/reservation/constants'
import {
  normalizeCustomerSearchName,
  upsertCustomerIdentity,
} from '@/lib/reservation/customers'
import {
  canCustomerChangeAppointment,
  getLocalDateKey,
} from '@/lib/reservation/time'
import { Prisma, type PrismaClient } from '@/prisma/generated/prisma/client'

export class ReservationError extends Error {
  constructor(
    public readonly code: 'SLOT_UNAVAILABLE' | 'APPOINTMENT_UNAVAILABLE',
  ) {
    super(code)
  }
}

interface PublicAppointmentInput {
  serviceId: string
  startsAt: Date
  firstName: string
  lastName: string
  email: string
  phone: string
  comment: string | null
}

const shouldRetry = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2034'

const isOverlapConstraint = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes('appointment_no_confirmed_overlap') ||
    error.message.includes('Exclusion constraint'))

export const createAppointmentSerializable = async (
  prisma: PrismaClient,
  input: PublicAppointmentInput,
) => {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async transaction => {
          const service = await transaction.service.findFirst({
            where: {
              id: input.serviceId,
              isBookable: true,
              isVisible: true,
              isArchived: false,
            },
          })
          if (!service) throw new ReservationError('SLOT_UNAVAILABLE')

          const slots = await getAvailableSlots({
            database: transaction,
            serviceId: service.id,
            dateKey: getLocalDateKey(input.startsAt),
          })
          if (
            !slots.some(slot => slot.startsAt === input.startsAt.toISOString())
          )
            throw new ReservationError('SLOT_UNAVAILABLE')

          const customer = await upsertCustomerIdentity(transaction, {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
          })

          const appointment = await transaction.appointment.create({
            data: {
              serviceId: service.id,
              customerId: customer?.id,
              serviceNameSnapshot: service.name,
              servicePriceCents: service.priceCents,
              serviceDurationMinutes: service.durationMinutes,
              preparationMinutes: service.preparationMinutes,
              cleanupMinutes: service.cleanupMinutes,
              startsAt: input.startsAt,
              endsAt: new Date(
                input.startsAt.getTime() + service.durationMinutes * 60_000,
              ),
              occupiedStartsAt: new Date(
                input.startsAt.getTime() - service.preparationMinutes * 60_000,
              ),
              occupiedEndsAt: new Date(
                input.startsAt.getTime() +
                  (service.durationMinutes + service.cleanupMinutes) * 60_000,
              ),
              customerFirstName: input.firstName,
              customerLastName: input.lastName,
              customerSearchName: normalizeCustomerSearchName(
                input.firstName,
                input.lastName,
              ),
              customerEmail: input.email,
              customerPhone: input.phone,
              customerIdentityDigest: createCustomerIdentityDigest(
                input.email,
                input.phone,
              ),
              comment: input.comment,
              source: 'PUBLIC',
              status: 'CONFIRMED',
            },
          })
          await transaction.appointmentActivity.create({
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
            actorId: customer?.id ?? 'unlinked-customer',
            entityType: 'APPOINTMENT',
            entityId: appointment.id,
            entityLabel: appointment.serviceNameSnapshot,
            action: 'CREATED',
            after: {
              serviceId: appointment.serviceId,
              startsAt: appointment.startsAt.toISOString(),
              status: appointment.status,
            },
          })
          return appointment
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (error) {
      if (error instanceof ReservationError) throw error
      if (isOverlapConstraint(error))
        throw new ReservationError('SLOT_UNAVAILABLE')
      if (!shouldRetry(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS)
        throw error
    }
  }
  throw new ReservationError('SLOT_UNAVAILABLE')
}

interface MoveAppointmentInput {
  appointmentId: string
  startsAt: Date
  customerId: string
  now?: Date
}

export const moveAppointmentSerializable = async (
  prisma: PrismaClient,
  {
    appointmentId,
    startsAt,
    customerId,
    now = new Date(),
  }: MoveAppointmentInput,
) => {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async transaction => {
          const appointment = await transaction.appointment.findFirst({
            where: {
              id: appointmentId,
              customerId,
              status: 'CONFIRMED',
            },
          })
          if (
            !appointment ||
            !canCustomerChangeAppointment(appointment.startsAt, now)
          )
            throw new ReservationError('APPOINTMENT_UNAVAILABLE')

          const slots = await getAvailableSlots({
            database: transaction,
            serviceId: appointment.serviceId,
            dateKey: getLocalDateKey(startsAt),
            now,
            excludeAppointmentId: appointment.id,
          })
          if (!slots.some(slot => slot.startsAt === startsAt.toISOString()))
            throw new ReservationError('SLOT_UNAVAILABLE')

          const updated = await transaction.appointment.update({
            where: { id: appointment.id },
            data: {
              startsAt,
              endsAt: new Date(
                startsAt.getTime() +
                  appointment.serviceDurationMinutes * 60_000,
              ),
              occupiedStartsAt: new Date(
                startsAt.getTime() - appointment.preparationMinutes * 60_000,
              ),
              occupiedEndsAt: new Date(
                startsAt.getTime() +
                  (appointment.serviceDurationMinutes +
                    appointment.cleanupMinutes) *
                    60_000,
              ),
            },
          })
          await transaction.appointmentActivity.create({
            data: {
              type: 'RESCHEDULED',
              appointmentId: updated.id,
              customerFirstNameSnapshot: updated.customerFirstName,
              customerLastNameSnapshot: updated.customerLastName,
              serviceNameSnapshot: updated.serviceNameSnapshot,
              appointmentStartsAt: updated.startsAt,
              previousAppointmentStartsAt: appointment.startsAt,
            },
          })
          await writeAuditEvent(transaction, {
            actorType: 'CUSTOMER',
            actorId: customerId,
            entityType: 'APPOINTMENT',
            entityId: updated.id,
            entityLabel: updated.serviceNameSnapshot,
            action: 'RESCHEDULED',
            before: { startsAt: appointment.startsAt.toISOString() },
            after: { startsAt: updated.startsAt.toISOString() },
          })
          return updated
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (error) {
      if (error instanceof ReservationError) throw error
      if (isOverlapConstraint(error))
        throw new ReservationError('SLOT_UNAVAILABLE')
      if (!shouldRetry(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS)
        throw error
    }
  }
  throw new ReservationError('SLOT_UNAVAILABLE')
}

export const cancelAppointmentSerializable = async (
  prisma: PrismaClient,
  appointmentId: string,
  customerId: string,
  now = new Date(),
) =>
  prisma.$transaction(
    async transaction => {
      const appointment = await transaction.appointment.findFirst({
        where: {
          id: appointmentId,
          customerId,
          status: 'CONFIRMED',
        },
      })
      if (
        !appointment ||
        !canCustomerChangeAppointment(appointment.startsAt, now)
      )
        throw new ReservationError('APPOINTMENT_UNAVAILABLE')

      const cancelled = await transaction.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CANCELLED', cancelledAt: now },
      })
      await transaction.appointmentActivity.create({
        data: {
          type: 'CANCELLED',
          appointmentId: cancelled.id,
          customerFirstNameSnapshot: cancelled.customerFirstName,
          customerLastNameSnapshot: cancelled.customerLastName,
          serviceNameSnapshot: cancelled.serviceNameSnapshot,
          appointmentStartsAt: cancelled.startsAt,
        },
      })
      await writeAuditEvent(transaction, {
        actorType: 'CUSTOMER',
        actorId: customerId,
        entityType: 'APPOINTMENT',
        entityId: cancelled.id,
        entityLabel: cancelled.serviceNameSnapshot,
        action: 'CANCELLED',
        before: { status: appointment.status },
        after: { status: cancelled.status },
      })
      return cancelled
    },
    { isolationLevel: 'Serializable' },
  )
