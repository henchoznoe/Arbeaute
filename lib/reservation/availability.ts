import {
  type BookingSettingsValues,
  DEFAULT_BOOKING_SETTINGS,
} from '@/lib/reservation/booking-settings'
import {
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

/**
 * `ON_REQUEST` : l'heure est libre, mais trop proche pour être réservée en
 * ligne. Elle reste affichée au lieu de disparaître — une journée vide qui
 * s'annonce « complète » coûte une réservation à chaque fois.
 */
type SlotState = 'OPEN' | 'ON_REQUEST'

export interface AvailableSlot {
  startsAt: string
  label: string
  state: SlotState
}

export type AvailabilityDayState =
  | 'AVAILABLE'
  | 'ON_REQUEST'
  | 'FULL'
  | 'CLOSED'

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
  settings?: BookingSettingsValues
}

interface RangeAvailabilityOptions {
  database: DatabaseClient
  serviceId: string
  fromDateKey: string
  toDateKey: string
  now?: Date
  excludeAppointmentId?: string
  settings?: BookingSettingsValues
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
  settings: BookingSettingsValues,
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

  const earliest = new Date(
    now.getTime() + settings.minBookingNoticeHours * 60 * 60 * 1000,
  )
  // Sans les demandes de dernière minute, le plancher est le délai lui-même :
  // le comportement reste exactement celui d'avant le réglage.
  const floor = settings.lateRequestsEnabled
    ? new Date(now.getTime() + settings.lateRequestFloorHours * 60 * 60 * 1000)
    : earliest
  const { latest } = getBookingDateLimits(now, settings.bookingHorizonMonths)
  const slots: AvailableSlot[] = []

  for (
    let minute = 0;
    minute < 24 * 60;
    minute += settings.slotIntervalMinutes
  ) {
    const startsAt = localDateMinuteToUtc(dateKey, minute)
    const endsAt = new Date(
      startsAt.getTime() + service.durationMinutes * 60_000,
    )
    const occupied = {
      start: new Date(startsAt.getTime() - service.preparationMinutes * 60_000),
      end: new Date(endsAt.getTime() + service.cleanupMinutes * 60_000),
    }

    // L'horizon et le plancher restent des filtres durs : au-delà, et en
    // deçà, rien n'est proposé, pas même sur demande.
    if (startsAt < floor || startsAt > latest) continue
    if (!openings.some(opening => contains(opening, occupied))) continue
    if (blocked.some(interval => overlaps(interval, occupied))) continue

    slots.push({
      startsAt: startsAt.toISOString(),
      label: formatSlotTime(startsAt),
      state: startsAt < earliest ? 'ON_REQUEST' : 'OPEN',
    })
  }

  const uniqueSlots = [
    ...new Map(slots.map(slot => [slot.startsAt, slot])).values(),
  ]
  // Une journée qui n'a plus que des heures sur demande n'est ni disponible ni
  // complète : la confondre avec l'une ou l'autre est précisément le défaut
  // que ce réglage corrige.
  const state: AvailabilityDayState = uniqueSlots.some(
    slot => slot.state === 'OPEN',
  )
    ? 'AVAILABLE'
    : uniqueSlots.length > 0
      ? 'ON_REQUEST'
      : 'FULL'
  return { state, slots: uniqueSlots }
}

const computeSlotsForDay = (
  window: AvailabilityWindow,
  dateKey: string,
  now: Date,
  settings: BookingSettingsValues,
): AvailableSlot[] =>
  computeAvailabilityForDay(window, dateKey, now, settings).slots

export const getAvailableSlots = async ({
  database,
  serviceId,
  dateKey,
  now = new Date(),
  excludeAppointmentId,
  settings = DEFAULT_BOOKING_SETTINGS,
}: AvailabilityOptions): Promise<AvailableSlot[]> => {
  if (!isDateKey(dateKey)) return []

  const window = await loadAvailabilityWindow({
    database,
    serviceId,
    fromDateKey: dateKey,
    toDateKey: dateKey,
    excludeAppointmentId,
  })

  return window ? computeSlotsForDay(window, dateKey, now, settings) : []
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
  settings = DEFAULT_BOOKING_SETTINGS,
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
      computeSlotsForDay(window, dateKey, now, settings),
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
  settings = DEFAULT_BOOKING_SETTINGS,
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
      computeAvailabilityForDay(window, dateKey, now, settings),
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
  settings?: BookingSettingsValues
}

export const findNextAvailableSlot = async ({
  database,
  serviceId,
  fromDateKey,
  now = new Date(),
  excludeAppointmentId,
  settings = DEFAULT_BOOKING_SETTINGS,
}: NextAvailableOptions): Promise<NextAvailableSlot | null> => {
  if (!isDateKey(fromDateKey)) return null
  const { max } = getBookingDateLimits(now, settings.bookingHorizonMonths)
  if (fromDateKey > max) return null

  const window = await loadAvailabilityWindow({
    database,
    serviceId,
    fromDateKey,
    toDateKey: max,
    excludeAppointmentId,
  })
  if (!window) return null

  for (const dateKey of getDateKeysInRange(fromDateKey, max)) {
    // « Le prochain créneau disponible » promet une réservation immédiate :
    // une heure sur demande n'en est pas une.
    const slot = computeSlotsForDay(window, dateKey, now, settings).find(
      candidate => candidate.state === 'OPEN',
    )
    if (slot) return { dateKey, slot }
  }

  return null
}
