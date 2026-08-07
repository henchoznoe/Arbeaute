import {
  MIN_BOOKING_NOTICE_MS,
  SLOT_INTERVAL_MINUTES,
} from '@/lib/reservation/constants'
import {
  addLocalDays,
  formatSlotTime,
  getBookingDateLimits,
  getLocalDayBounds,
  getLocalDayOfWeek,
  isDateKey,
  localDateMinuteToUtc,
} from '@/lib/reservation/time'
import type { Prisma } from '@/prisma/generated/prisma/client'

type DatabaseClient = Prisma.TransactionClient

interface Interval {
  start: Date
  end: Date
}

export interface AvailableSlot {
  startsAt: string
  label: string
}

interface AvailabilityOptions {
  database: DatabaseClient
  serviceId: string
  dateKey: string
  now?: Date
  excludeAppointmentId?: string
}

const overlaps = (first: Interval, second: Interval): boolean =>
  first.start < second.end && first.end > second.start

const contains = (outer: Interval, inner: Interval): boolean =>
  inner.start >= outer.start && inner.end <= outer.end

const mergeIntervals = (intervals: Interval[]): Interval[] => {
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

export const getAvailableSlots = async ({
  database,
  serviceId,
  dateKey,
  now = new Date(),
  excludeAppointmentId,
}: AvailabilityOptions): Promise<AvailableSlot[]> => {
  if (!isDateKey(dateKey)) return []

  const service = await database.service.findFirst({
    where: {
      id: serviceId,
      isBookable: true,
      isVisible: true,
      isArchived: false,
    },
    select: {
      durationMinutes: true,
      preparationMinutes: true,
      cleanupMinutes: true,
    },
  })
  if (!service) return []

  const { start: dayStart, end: dayEnd } = getLocalDayBounds(dateKey)
  const dayOfWeek = getLocalDayOfWeek(dateKey)
  const [weekly, exceptions, appointments] = await Promise.all([
    database.weeklyAvailability.findMany({ where: { dayOfWeek } }),
    database.availabilityException.findMany({
      where: { startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
    }),
    database.appointment.findMany({
      where: {
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        status: 'CONFIRMED',
        startsAt: { lt: new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000) },
        endsAt: { gt: new Date(dayStart.getTime() - 24 * 60 * 60 * 1000) },
      },
      select: {
        startsAt: true,
        endsAt: true,
        preparationMinutes: true,
        cleanupMinutes: true,
      },
    }),
  ])

  const openings = mergeIntervals([
    ...weekly.map(range => ({
      start: localDateMinuteToUtc(dateKey, range.startMinute),
      end: localDateMinuteToUtc(dateKey, range.endMinute),
    })),
    ...exceptions
      .filter(exception => exception.type === 'AVAILABLE')
      .map(exception => ({
        start: exception.startsAt < dayStart ? dayStart : exception.startsAt,
        end: exception.endsAt > dayEnd ? dayEnd : exception.endsAt,
      })),
  ])
  if (openings.length === 0) return []

  const blocked = [
    ...exceptions
      .filter(exception => exception.type === 'UNAVAILABLE')
      .map(exception => ({ start: exception.startsAt, end: exception.endsAt })),
    ...appointments.map(appointment => ({
      start: new Date(
        appointment.startsAt.getTime() -
          appointment.preparationMinutes * 60_000,
      ),
      end: new Date(
        appointment.endsAt.getTime() + appointment.cleanupMinutes * 60_000,
      ),
    })),
  ]

  const earliest = new Date(now.getTime() + MIN_BOOKING_NOTICE_MS)
  const { latest } = getBookingDateLimits(now)
  const slots: AvailableSlot[] = []

  for (let minute = 0; minute < 24 * 60; minute += SLOT_INTERVAL_MINUTES) {
    const startsAt = localDateMinuteToUtc(dateKey, minute)
    const endsAt = new Date(
      startsAt.getTime() + service.durationMinutes * 60_000,
    )
    const occupied = {
      start: new Date(startsAt.getTime() - service.preparationMinutes * 60_000),
      end: new Date(endsAt.getTime() + service.cleanupMinutes * 60_000),
    }

    if (startsAt < earliest || startsAt > latest) continue
    if (!openings.some(opening => contains(opening, occupied))) continue
    if (blocked.some(interval => overlaps(interval, occupied))) continue

    slots.push({
      startsAt: startsAt.toISOString(),
      label: formatSlotTime(startsAt),
    })
  }

  return [...new Map(slots.map(slot => [slot.startsAt, slot])).values()]
}

export interface NextAvailableSlot {
  dateKey: string
  slot: AvailableSlot
}

interface NextAvailableOptions {
  database: DatabaseClient
  serviceId: string
  fromDateKey: string
  now?: Date
}

const MAX_NEXT_AVAILABLE_SEARCH_DAYS = 100

export const findNextAvailableSlot = async ({
  database,
  serviceId,
  fromDateKey,
  now = new Date(),
}: NextAvailableOptions): Promise<NextAvailableSlot | null> => {
  if (!isDateKey(fromDateKey)) return null
  const { max } = getBookingDateLimits(now)

  let dateKey = fromDateKey
  for (
    let day = 0;
    day < MAX_NEXT_AVAILABLE_SEARCH_DAYS && dateKey <= max;
    day += 1
  ) {
    const slots = await getAvailableSlots({
      database,
      serviceId,
      dateKey,
      now,
    })
    if (slots.length > 0) return { dateKey, slot: slots[0] }
    dateKey = addLocalDays(dateKey, 1)
  }

  return null
}
