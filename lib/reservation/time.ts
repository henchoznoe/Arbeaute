import { addMonths } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import {
  CUSTOMER_CHANGE_CUTOFF_MS,
  RESERVATION_TIME_ZONE,
} from '@/lib/reservation/constants'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const isDateKey = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export const addLocalDays = (dateKey: string, amount: number): string => {
  if (!isDateKey(dateKey)) throw new Error('Invalid date')
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + amount))
  return date.toISOString().slice(0, 10)
}

/** Liste inclusive des dates entre deux clés de date, dans l'ordre chronologique. */
export const getDateKeysInRange = (
  startDateKey: string,
  endDateKey: string,
): string[] => {
  if (!isDateKey(startDateKey) || !isDateKey(endDateKey))
    throw new Error('Invalid date')
  if (endDateKey < startDateKey) throw new Error('Invalid date range')
  const dateKeys: string[] = []
  for (let cursor = startDateKey; cursor <= endDateKey; ) {
    dateKeys.push(cursor)
    cursor = addLocalDays(cursor, 1)
  }
  return dateKeys
}

export const localDateMinuteToUtc = (dateKey: string, minute: number): Date => {
  if (!isDateKey(dateKey) || minute < 0 || minute > 24 * 60)
    throw new Error('Invalid local date-time')
  const hours = Math.floor(minute / 60)
    .toString()
    .padStart(2, '0')
  const minutes = (minute % 60).toString().padStart(2, '0')
  return fromZonedTime(
    `${dateKey}T${hours}:${minutes}:00`,
    RESERVATION_TIME_ZONE,
  )
}

export const getLocalDayBounds = (
  dateKey: string,
): { start: Date; end: Date } => ({
  start: localDateMinuteToUtc(dateKey, 0),
  end: localDateMinuteToUtc(addLocalDays(dateKey, 1), 0),
})

export const getLocalDayOfWeek = (dateKey: string): number => {
  if (!isDateKey(dateKey)) throw new Error('Invalid date')
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export const getLocalDateKey = (date: Date): string =>
  formatInTimeZone(date, RESERVATION_TIME_ZONE, 'yyyy-MM-dd')

export const getLocalWeekDateKeys = (anchorDateKey: string): string[] => {
  const dayOfWeek = getLocalDayOfWeek(anchorDateKey)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = addLocalDays(anchorDateKey, mondayOffset)
  return Array.from({ length: 7 }, (_, index) => addLocalDays(monday, index))
}

export const getBookingDateLimits = (
  now = new Date(),
): { min: string; max: string; latest: Date } => {
  const latest = addMonths(now, 3)
  return {
    min: getLocalDateKey(now),
    max: getLocalDateKey(latest),
    latest,
  }
}

const isBusinessDateKey = (dateKey: string): boolean => {
  const dayOfWeek = getLocalDayOfWeek(dateKey)
  return dayOfWeek >= 1 && dayOfWeek <= 5
}

/**
 * Recule d'une durée exprimée en heures ouvrables : seules les heures tombant
 * du lundi au vendredi (fuseau de l'institut) sont décomptées.
 */
const subtractBusinessTime = (target: Date, ms: number): Date => {
  if (ms <= 0) return new Date(target.getTime())
  let remaining = ms
  // Fin (exclusive) de la tranche de journée en cours d'examen.
  let sliceEnd = new Date(target.getTime())
  let dateKey = getLocalDateKey(target)

  // Borne de sécurité : 48 h ouvrables couvrent au plus ~10 jours calendaires.
  for (let guard = 0; guard < 400; guard += 1) {
    const dayStart = localDateMinuteToUtc(dateKey, 0)

    if (isBusinessDateKey(dateKey)) {
      const availableInDay = sliceEnd.getTime() - dayStart.getTime()
      if (availableInDay >= remaining)
        return new Date(sliceEnd.getTime() - remaining)
      remaining -= availableInDay
    }

    // La fin du jour précédent est exactement le début du jour courant.
    sliceEnd = dayStart
    dateKey = addLocalDays(dateKey, -1)
  }

  return sliceEnd
}

/**
 * Dernier instant auquel le client peut encore déplacer ou annuler lui-même.
 */
export const getCustomerChangeDeadline = (startsAt: Date): Date =>
  subtractBusinessTime(startsAt, CUSTOMER_CHANGE_CUTOFF_MS)

export const canCustomerChangeAppointment = (
  startsAt: Date,
  now = new Date(),
): boolean => now.getTime() < getCustomerChangeDeadline(startsAt).getTime()

export const formatAppointmentDate = (date: Date): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: RESERVATION_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

export const formatSlotTime = (date: Date): string =>
  formatInTimeZone(date, RESERVATION_TIME_ZONE, 'HH:mm')
