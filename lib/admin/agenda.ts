import { writeAuditEvent } from '@/lib/admin/audit'
import { createCustomerIdentityDigest } from '@/lib/core/session-cookies'
import {
  MAX_SERIALIZABLE_ATTEMPTS,
  RESERVATION_TIME_ZONE,
} from '@/lib/reservation/constants'
import {
  normalizeCustomerSearchName,
  upsertCustomerIdentity,
} from '@/lib/reservation/customers'
import {
  addLocalDays,
  getDateKeysInRange,
  getLocalDateKey,
  getLocalDayBounds,
  getLocalDayOfWeek,
  localDateMinuteToUtc,
} from '@/lib/reservation/time'
import { Prisma, type PrismaClient } from '@/prisma/generated/prisma/client'
import type { AvailabilityExceptionType } from '@/prisma/generated/prisma/enums'

export const MAX_APPOINTMENT_SERIES_OCCURRENCES = 24
export const MAX_APPOINTMENT_SERIES_INTERVAL_WEEKS = 12

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

export interface AdminAppointmentSeriesInput {
  serviceId: string
  date: string
  minute: number
  occurrenceCount: number
  intervalWeeks: number
  firstName: string | null
  lastName: string
  email: string | null
  phone: string | null
  comment: string | null
  acknowledgeOutsideHours?: boolean
}

interface AdminAppointmentSeriesOccurrence {
  index: number
  date: string
  time: string
  endsAtTime: string
  occupiedStartsAtTime: string
  occupiedEndsAtTime: string
  conflictTime: string | null
  outsidePublicHours: boolean
}

export interface AdminAppointmentSeriesPreview {
  occurrences: AdminAppointmentSeriesOccurrence[]
  conflictCount: number
  outsidePublicHoursCount: number
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

export class AdminAppointmentSeriesError extends Error {
  constructor(
    public readonly code: 'CONFLICT' | 'OUTSIDE_HOURS',
    public readonly preview: AdminAppointmentSeriesPreview,
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

export interface AvailabilityExceptionRow {
  type: AvailabilityExceptionType
  startsAt: Date
  endsAt: Date
  label: string | null
}

/**
 * Répète la même plage horaire chaque jour entre deux dates, pour créer en un
 * coup une exception (ouverture ou fermeture) qui couvre plusieurs jours au
 * lieu de devoir en saisir une par jour.
 */
export const buildAvailabilityExceptionRows = ({
  type,
  startDateKey,
  endDateKey,
  startMinute,
  endMinute,
  label,
}: {
  type: AvailabilityExceptionType
  startDateKey: string
  endDateKey: string
  startMinute: number
  endMinute: number
  label: string | null
}): AvailabilityExceptionRow[] =>
  getDateKeysInRange(startDateKey, endDateKey).map(dateKey => ({
    type,
    startsAt: localDateMinuteToUtc(dateKey, startMinute),
    endsAt: localDateMinuteToUtc(dateKey, endMinute),
    label,
  }))

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

const formatLocalTime = (date: Date): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: RESERVATION_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

export const buildAdminAppointmentSeriesStarts = ({
  date,
  minute,
  occurrenceCount,
  intervalWeeks,
}: Pick<
  AdminAppointmentSeriesInput,
  'date' | 'minute' | 'occurrenceCount' | 'intervalWeeks'
>): Date[] => {
  if (
    occurrenceCount < 2 ||
    occurrenceCount > MAX_APPOINTMENT_SERIES_OCCURRENCES ||
    intervalWeeks < 1 ||
    intervalWeeks > MAX_APPOINTMENT_SERIES_INTERVAL_WEEKS
  )
    throw new Error('INVALID_SERIES')
  return Array.from({ length: occurrenceCount }, (_, index) =>
    localDateMinuteToUtc(addLocalDays(date, index * intervalWeeks * 7), minute),
  )
}

type SeriesValidationDatabase = Pick<
  Prisma.TransactionClient,
  'appointment' | 'availabilityException' | 'service' | 'weeklyAvailability'
>

const validateAdminAppointmentSeries = async (
  database: SeriesValidationDatabase,
  input: AdminAppointmentSeriesInput,
): Promise<{
  preview: AdminAppointmentSeriesPreview
  service: {
    id: string
    name: string
    priceCents: number
    durationMinutes: number
    preparationMinutes: number
    cleanupMinutes: number
    isArchived: boolean
  }
  startsAt: Date[]
}> => {
  const service = await database.service.findUnique({
    where: { id: input.serviceId },
    select: {
      id: true,
      name: true,
      priceCents: true,
      durationMinutes: true,
      preparationMinutes: true,
      cleanupMinutes: true,
      isArchived: true,
    },
  })
  if (!service || service.isArchived)
    throw new AdminAgendaError('SERVICE_NOT_FOUND')

  const startsAt = buildAdminAppointmentSeriesStarts(input)
  const occupiedStartsAt = startsAt.map(
    start => new Date(start.getTime() - service.preparationMinutes * 60_000),
  )
  const occupiedEndsAt = startsAt.map(
    start =>
      new Date(
        start.getTime() +
          (service.durationMinutes + service.cleanupMinutes) * 60_000,
      ),
  )
  const windowStart = occupiedStartsAt[0]
  const windowEnd = occupiedEndsAt.at(-1)
  if (!windowStart || !windowEnd) throw new Error('INVALID_SERIES')

  const [appointments, weeklyRanges, exceptions] = await Promise.all([
    database.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        occupiedStartsAt: { lt: windowEnd },
        occupiedEndsAt: { gt: windowStart },
      },
      select: {
        startsAt: true,
        occupiedStartsAt: true,
        occupiedEndsAt: true,
      },
    }),
    database.weeklyAvailability.findMany(),
    database.availabilityException.findMany({
      where: { startsAt: { lt: windowEnd }, endsAt: { gt: windowStart } },
    }),
  ])

  const occurrences = startsAt.map((start, index) => {
    const occupied = {
      start: occupiedStartsAt[index] as Date,
      end: occupiedEndsAt[index] as Date,
    }
    const date = getLocalDateKey(start)
    const conflict = appointments.find(appointment =>
      overlaps(occupied, {
        start: appointment.occupiedStartsAt,
        end: appointment.occupiedEndsAt,
      }),
    )
    const insidePublicHours = isInsidePublicOpening({
      occupied,
      weekly: weeklyRanges
        .filter(range => range.dayOfWeek === getLocalDayOfWeek(date))
        .map(range => ({
          start: localDateMinuteToUtc(date, range.startMinute),
          end: localDateMinuteToUtc(date, range.endMinute),
        })),
      available: exceptions
        .filter(exception => exception.type === 'AVAILABLE')
        .map(exception => ({
          start: exception.startsAt,
          end: exception.endsAt,
        })),
      unavailable: exceptions
        .filter(exception => exception.type === 'UNAVAILABLE')
        .map(exception => ({
          start: exception.startsAt,
          end: exception.endsAt,
        })),
    })
    const endsAt = new Date(start.getTime() + service.durationMinutes * 60_000)
    return {
      index: index + 1,
      date,
      time: formatLocalTime(start),
      endsAtTime: formatLocalTime(endsAt),
      occupiedStartsAtTime: formatLocalTime(occupied.start),
      occupiedEndsAtTime: formatLocalTime(occupied.end),
      conflictTime: conflict ? formatLocalTime(conflict.startsAt) : null,
      outsidePublicHours: !insidePublicHours,
    }
  })
  return {
    service,
    startsAt,
    preview: {
      occurrences,
      conflictCount: occurrences.filter(occurrence => occurrence.conflictTime)
        .length,
      outsidePublicHoursCount: occurrences.filter(
        occurrence => occurrence.outsidePublicHours,
      ).length,
    },
  }
}

export const previewAdminAppointmentSeries = async (
  database: PrismaClient,
  input: AdminAppointmentSeriesInput,
): Promise<AdminAppointmentSeriesPreview> =>
  (await validateAdminAppointmentSeries(database, input)).preview

const shouldRetry = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2034'

const isOverlapConstraint = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes('appointment_no_confirmed_overlap') ||
    error.message.includes('Exclusion constraint'))

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

          const customer =
            input.email && input.phone
              ? await upsertCustomerIdentity(transaction, {
                  firstName: input.firstName,
                  lastName: input.lastName,
                  email: input.email,
                  phone: input.phone,
                })
              : null

          const data = {
            serviceId: service.id,
            customerId: customer?.id ?? null,
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
            customerSearchName: normalizeCustomerSearchName(
              input.firstName,
              input.lastName,
            ),
            customerEmail: input.email,
            customerPhone: input.phone,
            customerIdentityDigest:
              input.email && input.phone
                ? createCustomerIdentityDigest(input.email, input.phone)
                : null,
            comment: input.comment,
          }

          if (!current) {
            const created = await transaction.appointment.create({
              data: { ...data, source: 'ADMIN', status: 'CONFIRMED' },
            })
            await writeAuditEvent(transaction, {
              actorType: 'ADMIN',
              actorId: 'admin',
              entityType: 'APPOINTMENT',
              entityId: created.id,
              entityLabel: created.serviceNameSnapshot,
              action: 'CREATED',
              after: {
                serviceId: created.serviceId,
                startsAt: created.startsAt.toISOString(),
                status: created.status,
              },
            })
            return created
          }

          const updated = await transaction.appointment.update({
            where: { id: current.id },
            data,
          })
          await writeAuditEvent(transaction, {
            actorType: 'ADMIN',
            actorId: 'admin',
            entityType: 'APPOINTMENT',
            entityId: updated.id,
            entityLabel: updated.serviceNameSnapshot,
            action: 'UPDATED',
            before: {
              serviceId: current.serviceId,
              startsAt: current.startsAt.toISOString(),
            },
            after: {
              serviceId: updated.serviceId,
              startsAt: updated.startsAt.toISOString(),
            },
          })
          return updated
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

export const createAdminAppointmentSeriesSerializable = async (
  prisma: PrismaClient,
  input: AdminAppointmentSeriesInput,
) => {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async transaction => {
          const validation = await validateAdminAppointmentSeries(
            transaction,
            input,
          )
          if (validation.preview.conflictCount > 0)
            throw new AdminAppointmentSeriesError(
              'CONFLICT',
              validation.preview,
            )
          if (
            validation.preview.outsidePublicHoursCount > 0 &&
            !input.acknowledgeOutsideHours
          )
            throw new AdminAppointmentSeriesError(
              'OUTSIDE_HOURS',
              validation.preview,
            )

          const customer =
            input.email && input.phone
              ? await upsertCustomerIdentity(transaction, {
                  firstName: input.firstName,
                  lastName: input.lastName,
                  email: input.email,
                  phone: input.phone,
                })
              : null
          const created = []
          for (const startsAt of validation.startsAt) {
            const endsAt = new Date(
              startsAt.getTime() + validation.service.durationMinutes * 60_000,
            )
            const appointment = await transaction.appointment.create({
              data: {
                serviceId: validation.service.id,
                customerId: customer?.id ?? null,
                serviceNameSnapshot: validation.service.name,
                servicePriceCents: validation.service.priceCents,
                serviceDurationMinutes: validation.service.durationMinutes,
                preparationMinutes: validation.service.preparationMinutes,
                cleanupMinutes: validation.service.cleanupMinutes,
                startsAt,
                endsAt,
                occupiedStartsAt: new Date(
                  startsAt.getTime() -
                    validation.service.preparationMinutes * 60_000,
                ),
                occupiedEndsAt: new Date(
                  endsAt.getTime() + validation.service.cleanupMinutes * 60_000,
                ),
                customerFirstName: input.firstName,
                customerLastName: input.lastName,
                customerSearchName: normalizeCustomerSearchName(
                  input.firstName,
                  input.lastName,
                ),
                customerEmail: input.email,
                customerPhone: input.phone,
                customerIdentityDigest:
                  input.email && input.phone
                    ? createCustomerIdentityDigest(input.email, input.phone)
                    : null,
                comment: input.comment,
                source: 'ADMIN',
                status: 'CONFIRMED',
              },
            })
            await writeAuditEvent(transaction, {
              actorType: 'ADMIN',
              actorId: 'admin',
              entityType: 'APPOINTMENT',
              entityId: appointment.id,
              entityLabel: appointment.serviceNameSnapshot,
              action: 'CREATED',
              after: {
                serviceId: appointment.serviceId,
                startsAt: appointment.startsAt.toISOString(),
                status: appointment.status,
                series: true,
              },
            })
            created.push(appointment)
          }
          return created
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (error) {
      if (
        error instanceof AdminAgendaError ||
        error instanceof AdminAppointmentSeriesError
      )
        throw error
      if (isOverlapConstraint(error)) {
        const preview = await previewAdminAppointmentSeries(prisma, input)
        throw new AdminAppointmentSeriesError('CONFLICT', preview)
      }
      if (!shouldRetry(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS)
        throw error
    }
  }
  throw new Error('SERIES_CREATION_FAILED')
}

export const cancelAdminAppointmentSerializable = async (
  prisma: PrismaClient,
  appointmentId: string,
) =>
  prisma.$transaction(
    async transaction => {
      const appointment = await transaction.appointment.findFirst({
        where: { id: appointmentId, status: 'CONFIRMED' },
        select: { id: true, status: true, serviceNameSnapshot: true },
      })
      if (!appointment) throw new AdminAgendaError('APPOINTMENT_NOT_FOUND')
      const cancelled = await transaction.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      })
      await writeAuditEvent(transaction, {
        actorType: 'ADMIN',
        actorId: 'admin',
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
