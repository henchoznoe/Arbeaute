import { appointmentAuditValues, writeAuditEvent } from '@/lib/admin/audit'
import {
  type AvailableSlot,
  getAdminRescheduleSlots,
} from '@/lib/reservation/availability'
import { MAX_SERIALIZABLE_ATTEMPTS } from '@/lib/reservation/constants'
import { getLocalDateKey } from '@/lib/reservation/time'
import { Prisma, type PrismaClient } from '@/prisma/generated/prisma/client'

export const rankRescheduleSlots = (
  slots: AvailableSlot[],
  current: Date,
): AvailableSlot[] => {
  const date = getLocalDateKey(current)
  return slots
    .filter(slot => new Date(slot.startsAt).getTime() !== current.getTime())
    .sort((a, b) => {
      const first = new Date(a.startsAt)
      const second = new Date(b.startsAt)
      const firstSameDay = getLocalDateKey(first) === date
      const secondSameDay = getLocalDateKey(second) === date
      if (firstSameDay !== secondSameDay) return firstSameDay ? -1 : 1
      return (
        (firstSameDay
          ? Math.abs(first.getTime() - current.getTime()) -
            Math.abs(second.getTime() - current.getTime())
          : 0) || first.getTime() - second.getTime()
      )
    })
}

export class AdminRescheduleError extends Error {
  constructor(public readonly code: 'CHANGED' | 'UNAVAILABLE') {
    super(code)
  }
}

export const rescheduleAdminAppointment = async (
  database: PrismaClient,
  input: {
    appointmentId: string
    expectedStartsAt: Date
    startsAt: Date
  },
  now = new Date(),
) => {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt++) {
    try {
      return await database.$transaction(
        async transaction => {
          const current = await transaction.appointment.findUnique({
            where: { id: input.appointmentId },
            include: {
              service: { select: { category: { select: { name: true } } } },
            },
          })
          if (
            current?.status !== 'CONFIRMED' ||
            current.startsAt.getTime() !== input.expectedStartsAt.getTime()
          )
            throw new AdminRescheduleError('CHANGED')
          if (
            input.startsAt <= now ||
            input.startsAt.getTime() === current.startsAt.getTime()
          )
            throw new AdminRescheduleError('UNAVAILABLE')
          const dateKey = getLocalDateKey(input.startsAt)
          const slots = await getAdminRescheduleSlots({
            database: transaction,
            appointment: current,
            fromDateKey: dateKey,
            toDateKey: dateKey,
            now,
          })
          if (
            !slots.some(
              slot =>
                new Date(slot.startsAt).getTime() === input.startsAt.getTime(),
            )
          )
            throw new AdminRescheduleError('UNAVAILABLE')
          const updated = await transaction.appointment.update({
            where: { id: current.id },
            data: {
              startsAt: input.startsAt,
              endsAt: new Date(
                input.startsAt.getTime() +
                  current.serviceDurationMinutes * 60_000,
              ),
              occupiedStartsAt: new Date(
                input.startsAt.getTime() - current.preparationMinutes * 60_000,
              ),
              occupiedEndsAt: new Date(
                input.startsAt.getTime() +
                  (current.serviceDurationMinutes + current.cleanupMinutes) *
                    60_000,
              ),
              allowsOverlap: false,
            },
          })
          await writeAuditEvent(transaction, {
            actorType: 'ADMIN',
            actorId: 'admin',
            entityType: 'APPOINTMENT',
            entityId: current.id,
            entityLabel: current.serviceNameSnapshot,
            action: 'RESCHEDULED',
            before: {
              startsAt: current.startsAt.toISOString(),
              endsAt: current.endsAt.toISOString(),
            },
            after: {
              ...appointmentAuditValues(updated),
            },
          })
          return {
            appointment: {
              ...updated,
              categoryName: current.service.category?.name ?? null,
            },
            previousStartsAt: current.startsAt,
          }
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        if (attempt < MAX_SERIALIZABLE_ATTEMPTS) continue
        throw new AdminRescheduleError('UNAVAILABLE')
      }
      if (
        error instanceof Error &&
        (error.message.includes('appointment_no_confirmed_overlap') ||
          error.message.includes('Exclusion constraint'))
      )
        throw new AdminRescheduleError('UNAVAILABLE')
      throw error
    }
  }
  throw new AdminRescheduleError('UNAVAILABLE')
}
