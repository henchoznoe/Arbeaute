import { createCustomerIdentityDigest } from '@/lib/core/session-cookies'
import { MAX_SERIALIZABLE_ATTEMPTS } from '@/lib/reservation/constants'
import {
  getLocalDateKey,
  getLocalDayBounds,
  getLocalDayOfWeek,
  localDateMinuteToUtc,
} from '@/lib/reservation/time'
import { Prisma, type PrismaClient } from '@/prisma/generated/prisma/client'

interface Interval {
  start: Date
  end: Date
}

interface AdminAppointmentInput {
  appointmentId?: string
  serviceId: string
  startsAt: Date
  firstName: string | null
  lastName: string
  email: string | null
  phone: string | null
  comment: string | null
}

export class AdminAgendaError extends Error {
  constructor(
    public readonly code:
      | 'APPOINTMENT_NOT_FOUND'
      | 'SERVICE_NOT_FOUND'
      | 'OVERLAP',
  ) {
    super(code)
  }
}

const overlaps = (first: Interval, second: Interval): boolean =>
  first.start < second.end && first.end > second.start

const contains = (outer: Interval, inner: Interval): boolean =>
  inner.start >= outer.start && inner.end <= outer.end

export const mergeIntervals = (intervals: Interval[]): Interval[] => {
  const sorted = intervals
    .filter(interval => interval.start < interval.end)
    .sort((first, second) => first.start.getTime() - second.start.getTime())
  const merged: Interval[] = []
  for (const interval of sorted) {
    const previous = merged.at(-1)
    if (!previous || interval.start > previous.end) merged.push({ ...interval })
    else if (interval.end > previous.end) previous.end = interval.end
  }
  return merged
}

export const isInsidePublicOpening = ({
  occupied,
  weekly,
  available,
  unavailable,
}: {
  occupied: Interval
  weekly: Interval[]
  available: Interval[]
  unavailable: Interval[]
}): boolean =>
  mergeIntervals([...weekly, ...available]).some(opening =>
    contains(opening, occupied),
  ) && !unavailable.some(blocked => overlaps(blocked, occupied))

export const isAdminAppointmentInsidePublicHours = async (
  prisma: PrismaClient,
  serviceId: string,
  startsAt: Date,
): Promise<boolean> => {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      durationMinutes: true,
      preparationMinutes: true,
      cleanupMinutes: true,
    },
  })
  if (!service) throw new AdminAgendaError('SERVICE_NOT_FOUND')

  const dateKey = getLocalDateKey(startsAt)
  const { start: dayStart, end: dayEnd } = getLocalDayBounds(dateKey)
  const [weeklyRanges, exceptions] = await Promise.all([
    prisma.weeklyAvailability.findMany({
      where: { dayOfWeek: getLocalDayOfWeek(dateKey) },
    }),
    prisma.availabilityException.findMany({
      where: { startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
    }),
  ])
  const occupied = {
    start: new Date(startsAt.getTime() - service.preparationMinutes * 60_000),
    end: new Date(
      startsAt.getTime() +
        (service.durationMinutes + service.cleanupMinutes) * 60_000,
    ),
  }
  return isInsidePublicOpening({
    occupied,
    weekly: weeklyRanges.map(range => ({
      start: localDateMinuteToUtc(dateKey, range.startMinute),
      end: localDateMinuteToUtc(dateKey, range.endMinute),
    })),
    available: exceptions
      .filter(exception => exception.type === 'AVAILABLE')
      .map(exception => ({ start: exception.startsAt, end: exception.endsAt })),
    unavailable: exceptions
      .filter(exception => exception.type === 'UNAVAILABLE')
      .map(exception => ({ start: exception.startsAt, end: exception.endsAt })),
  })
}

const shouldRetry = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2034'

const isOverlapConstraint = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes('appointment_no_confirmed_overlap') ||
    error.message.includes('Exclusion constraint'))

const identityDigest = (email: string | null, phone: string | null) =>
  email && phone ? createCustomerIdentityDigest(email, phone) : null

export const saveAdminAppointmentSerializable = async (
  prisma: PrismaClient,
  input: AdminAppointmentInput,
) => {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async transaction => {
          const current = input.appointmentId
            ? await transaction.appointment.findUnique({
                where: { id: input.appointmentId },
              })
            : null
          if (input.appointmentId && !current)
            throw new AdminAgendaError('APPOINTMENT_NOT_FOUND')
          const service = await transaction.service.findUnique({
            where: { id: input.serviceId },
          })
          if (
            !service ||
            (service.isArchived && service.id !== current?.serviceId)
          )
            throw new AdminAgendaError('SERVICE_NOT_FOUND')

          const endsAt = new Date(
            input.startsAt.getTime() + service.durationMinutes * 60_000,
          )
          const occupiedStartsAt = new Date(
            input.startsAt.getTime() - service.preparationMinutes * 60_000,
          )
          const occupiedEndsAt = new Date(
            endsAt.getTime() + service.cleanupMinutes * 60_000,
          )
          const conflict = await transaction.appointment.findFirst({
            where: {
              id: input.appointmentId
                ? { not: input.appointmentId }
                : undefined,
              status: 'CONFIRMED',
              occupiedStartsAt: { lt: occupiedEndsAt },
              occupiedEndsAt: { gt: occupiedStartsAt },
            },
            select: { id: true },
          })
          if (conflict) throw new AdminAgendaError('OVERLAP')

          const data = {
            serviceId: service.id,
            serviceNameSnapshot: service.name,
            servicePriceCents: service.priceCents,
            serviceDurationMinutes: service.durationMinutes,
            preparationMinutes: service.preparationMinutes,
            cleanupMinutes: service.cleanupMinutes,
            startsAt: input.startsAt,
            endsAt,
            occupiedStartsAt,
            occupiedEndsAt,
            customerFirstName: input.firstName,
            customerLastName: input.lastName,
            customerEmail: input.email,
            customerPhone: input.phone,
            customerIdentityDigest: identityDigest(input.email, input.phone),
            comment: input.comment,
          }

          if (!current)
            return transaction.appointment.create({
              data: { ...data, source: 'ADMIN', status: 'CONFIRMED' },
            })

          const identityChanged =
            current.customerEmail !== input.email ||
            current.customerPhone !== input.phone
          return transaction.appointment.update({
            where: { id: current.id },
            data: {
              ...data,
              customerIdentityVersion: identityChanged
                ? { increment: 1 }
                : undefined,
            },
          })
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (error) {
      if (error instanceof AdminAgendaError) throw error
      if (isOverlapConstraint(error)) throw new AdminAgendaError('OVERLAP')
      if (!shouldRetry(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS)
        throw error
    }
  }
  throw new AdminAgendaError('OVERLAP')
}

export const cancelAdminAppointmentSerializable = async (
  prisma: PrismaClient,
  appointmentId: string,
) =>
  prisma.$transaction(
    async transaction => {
      const appointment = await transaction.appointment.findFirst({
        where: { id: appointmentId, status: 'CONFIRMED' },
        select: { id: true },
      })
      if (!appointment) throw new AdminAgendaError('APPOINTMENT_NOT_FOUND')
      return transaction.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      })
    },
    { isolationLevel: 'Serializable' },
  )
