import {
  MIN_BOOKING_NOTICE_MS,
  SLOT_INTERVAL_MINUTES,
} from '@/lib/reservation/constants'
import {
  addLocalDays,
  formatSlotTime,
  getBookingDateLimits,
  getDateKeysInRange,
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

export type AvailabilityDayState = 'AVAILABLE' | 'FULL' | 'CLOSED'

export interface DayAvailability {
  state: AvailabilityDayState
  slots: AvailableSlot[]
}

interface WeeklyRange {
  dayOfWeek: number
  startMinute: number
  endMinute: number
}

interface AvailabilityException {
  type: 'AVAILABLE' | 'UNAVAILABLE'
  startsAt: Date
  endsAt: Date
}

interface BookedAppointment {
  startsAt: Date
  endsAt: Date
  preparationMinutes: number
  cleanupMinutes: number
}

/**
 * Tout ce qu'il faut pour calculer les créneaux d'une plage de jours, chargé
 * en une seule fois. Calculer sept jours coûte alors les mêmes quatre requêtes
 * qu'un seul, au lieu de quatre par jour.
 */
interface AvailabilityWindow {
  service: {
    durationMinutes: number
    preparationMinutes: number
    cleanupMinutes: number
  }
  weekly: WeeklyRange[]
  exceptions: AvailabilityException[]
  appointments: BookedAppointment[]
}

interface WindowOptions {
  database: DatabaseClient
  serviceId: string
  fromDateKey: string
  toDateKey: string
  excludeAppointmentId?: string
}

interface AvailabilityOptions {
  database: DatabaseClient
  serviceId: string
  dateKey: string
  now?: Date
  excludeAppointmentId?: string
}

interface RangeAvailabilityOptions {
  database: DatabaseClient
  serviceId: string
  fromDateKey: string
  toDateKey: string
  now?: Date
  excludeAppointmentId?: string
}

/**
 * Un rendez-vous voisin peut déborder sur le jour calculé via sa préparation
 * ou son nettoyage : on élargit la fenêtre interrogée d'un jour de chaque côté.
 */
const APPOINTMENT_MARGIN_MS = 24 * 60 * 60 * 1000

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

const loadAvailabilityWindow = async ({
  database,
  serviceId,
  fromDateKey,
  toDateKey,
  excludeAppointmentId,
}: WindowOptions): Promise<AvailabilityWindow | null> => {
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
  if (!service) return null

  const rangeStart = getLocalDayBounds(fromDateKey).start
  const rangeEnd = getLocalDayBounds(toDateKey).end

  const [weekly, exceptions, appointments] = await Promise.all([
    database.weeklyAvailability.findMany(),
    database.availabilityException.findMany({
      where: { startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
    }),
    database.appointment.findMany({
      where: {
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        status: 'CONFIRMED',
        startsAt: { lt: new Date(rangeEnd.getTime() + APPOINTMENT_MARGIN_MS) },
        endsAt: { gt: new Date(rangeStart.getTime() - APPOINTMENT_MARGIN_MS) },
      },
      select: {
        startsAt: true,
        endsAt: true,
        preparationMinutes: true,
        cleanupMinutes: true,
      },
    }),
  ])

  return { service, weekly, exceptions, appointments }
}

/** Calcul pur : aucune requête, tout vient de la fenêtre déjà chargée. */
const computeAvailabilityForDay = (
  window: AvailabilityWindow,
  dateKey: string,
  now: Date,
): DayAvailability => {
  if (!isDateKey(dateKey)) return { state: 'CLOSED', slots: [] }

  const { service } = window
  const { start: dayStart, end: dayEnd } = getLocalDayBounds(dateKey)
  const dayOfWeek = getLocalDayOfWeek(dateKey)
  const exceptionsToday = window.exceptions.filter(
    exception => exception.startsAt < dayEnd && exception.endsAt > dayStart,
  )

  const openings = mergeIntervals([
    ...window.weekly
      .filter(range => range.dayOfWeek === dayOfWeek)
      .map(range => ({
        start: localDateMinuteToUtc(dateKey, range.startMinute),
        end: localDateMinuteToUtc(dateKey, range.endMinute),
      })),
    ...exceptionsToday
      .filter(exception => exception.type === 'AVAILABLE')
      .map(exception => ({
        start: exception.startsAt < dayStart ? dayStart : exception.startsAt,
        end: exception.endsAt > dayEnd ? dayEnd : exception.endsAt,
      })),
  ])
  if (openings.length === 0) return { state: 'CLOSED', slots: [] }

  const unavailable = mergeIntervals(
    exceptionsToday
      .filter(exception => exception.type === 'UNAVAILABLE')
      .map(exception => ({ start: exception.startsAt, end: exception.endsAt })),
  )
  const hasUnblockedOpening = openings.some(
    opening =>
      !unavailable.some(
        closure => closure.start <= opening.start && closure.end >= opening.end,
      ),
  )
  if (!hasUnblockedOpening) return { state: 'CLOSED', slots: [] }

  const blocked = [
    ...unavailable,
    ...window.appointments.map(appointment => ({
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

  const uniqueSlots = [
    ...new Map(slots.map(slot => [slot.startsAt, slot])).values(),
  ]
  return {
    state: uniqueSlots.length > 0 ? 'AVAILABLE' : 'FULL',
    slots: uniqueSlots,
  }
}

const computeSlotsForDay = (
  window: AvailabilityWindow,
  dateKey: string,
  now: Date,
): AvailableSlot[] => computeAvailabilityForDay(window, dateKey, now).slots

export const getAvailableSlots = async ({
  database,
  serviceId,
  dateKey,
  now = new Date(),
  excludeAppointmentId,
}: AvailabilityOptions): Promise<AvailableSlot[]> => {
  if (!isDateKey(dateKey)) return []

  const window = await loadAvailabilityWindow({
    database,
    serviceId,
    fromDateKey: dateKey,
    toDateKey: dateKey,
    excludeAppointmentId,
  })

  return window ? computeSlotsForDay(window, dateKey, now) : []
}

/**
 * Créneaux de chaque jour d'une plage, indexés par clé de date. Le calendrier
 * public charge ainsi la semaine affichée d'un seul coup : naviguer d'un jour
 * à l'autre ne déclenche plus aucune requête.
 */
export const getAvailableSlotsByDate = async ({
  database,
  serviceId,
  fromDateKey,
  toDateKey,
  now = new Date(),
  excludeAppointmentId,
}: RangeAvailabilityOptions): Promise<Record<string, AvailableSlot[]>> => {
  if (!isDateKey(fromDateKey) || !isDateKey(toDateKey)) return {}
  if (toDateKey < fromDateKey) return {}

  const window = await loadAvailabilityWindow({
    database,
    serviceId,
    fromDateKey,
    toDateKey,
    excludeAppointmentId,
  })
  if (!window) return {}

  return Object.fromEntries(
    getDateKeysInRange(fromDateKey, toDateKey).map(dateKey => [
      dateKey,
      computeSlotsForDay(window, dateKey, now),
    ]),
  )
}

/**
 * Même chargement groupé que `getAvailableSlotsByDate`, avec l'état éditorial
 * nécessaire au calendrier. « Fermé » dépend des horaires et exceptions ;
 * « complet » signifie que l'institut ouvre mais qu'aucun créneau ne convient.
 */
export const getAvailabilityByDate = async ({
  database,
  serviceId,
  fromDateKey,
  toDateKey,
  now = new Date(),
  excludeAppointmentId,
}: RangeAvailabilityOptions): Promise<Record<string, DayAvailability>> => {
  if (!isDateKey(fromDateKey) || !isDateKey(toDateKey)) return {}
  if (toDateKey < fromDateKey) return {}

  const window = await loadAvailabilityWindow({
    database,
    serviceId,
    fromDateKey,
    toDateKey,
    excludeAppointmentId,
  })
  if (!window) return {}

  return Object.fromEntries(
    getDateKeysInRange(fromDateKey, toDateKey).map(dateKey => [
      dateKey,
      computeAvailabilityForDay(window, dateKey, now),
    ]),
  )
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
  excludeAppointmentId?: string
}

const MAX_NEXT_AVAILABLE_SEARCH_DAYS = 100

export const findNextAvailableSlot = async ({
  database,
  serviceId,
  fromDateKey,
  now = new Date(),
  excludeAppointmentId,
}: NextAvailableOptions): Promise<NextAvailableSlot | null> => {
  if (!isDateKey(fromDateKey)) return null
  const { max } = getBookingDateLimits(now)
  if (fromDateKey > max) return null

  const searchEnd = addLocalDays(
    fromDateKey,
    MAX_NEXT_AVAILABLE_SEARCH_DAYS - 1,
  )
  const toDateKey = searchEnd > max ? max : searchEnd

  const window = await loadAvailabilityWindow({
    database,
    serviceId,
    fromDateKey,
    toDateKey,
    excludeAppointmentId,
  })
  if (!window) return null

  for (const dateKey of getDateKeysInRange(fromDateKey, toDateKey)) {
    const slots = computeSlotsForDay(window, dateKey, now)
    if (slots.length > 0) return { dateKey, slot: slots[0] }
  }

  return null
}
