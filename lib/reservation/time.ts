import { addMonths } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import {
  DEFAULT_BOOKING_HORIZON_MONTHS,
  DEFAULT_CUSTOMER_CHANGE_CUTOFF_HOURS,
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
  bookingHorizonMonths = DEFAULT_BOOKING_HORIZON_MONTHS,
): { min: string; max: string; latest: Date } => {
  const latest = addMonths(now, bookingHorizonMonths)
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
export const getCustomerChangeDeadline = (
  startsAt: Date,
  cutoffBusinessHours = DEFAULT_CUSTOMER_CHANGE_CUTOFF_HOURS,
): Date => subtractBusinessTime(startsAt, cutoffBusinessHours * 60 * 60 * 1000)

export const canCustomerChangeAppointment = (
  startsAt: Date,
  now = new Date(),
  cutoffBusinessHours = DEFAULT_CUSTOMER_CHANGE_CUTOFF_HOURS,
): boolean =>
  now.getTime() <
  getCustomerChangeDeadline(startsAt, cutoffBusinessHours).getTime()

/**
 * Deux gabarits de date, et deux seulement.
 *
 * `fr-CH` fait insérer à ICU une virgule dès que le jour de la semaine et
 * l'année cohabitent — « lundi, 17 août 2026 » — et une autre devant l'heure
 * — « lun. 17 août 2026, 14:00 ». Ce n'est pas l'usage français, et surtout
 * cela donnait quatre écritures différentes d'une même date selon l'écran.
 * `normalizeFrenchDate` ramène tout le monde sur « lundi 17 août 2026 à 14:00 ».
 */
const normalizeFrenchDate = (formatted: string): string =>
  formatted.replace(/^(\S+),/, '$1').replace(/,\s(?=\d{1,2}:\d{2})/, ' à ')

const longDateParts = {
  timeZone: RESERVATION_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
} as const

const timeParts = { hour: '2-digit', minute: '2-digit' } as const

/** « 17 août 2026 » — quand le jour de la semaine n'apporte rien. */
export const formatDayDate = (date: Date): string =>
  new Intl.DateTimeFormat('fr-CH', longDateParts).format(date)

/** « lundi 17 août 2026 » — partout où la place ne manque pas. */
export const formatLongDate = (date: Date): string =>
  normalizeFrenchDate(
    new Intl.DateTimeFormat('fr-CH', {
      ...longDateParts,
      weekday: 'long',
    }).format(date),
  )

/** « lundi 17 août 2026 à 14:00 ». */
export const formatAppointmentDate = (date: Date): string =>
  normalizeFrenchDate(
    new Intl.DateTimeFormat('fr-CH', {
      ...longDateParts,
      weekday: 'long',
      ...timeParts,
    }).format(date),
  )

/** « lun. 17 août 2026 à 14:00 » — pour les listes, où chaque ligne compte. */
export const formatCompactMoment = (date: Date): string =>
  normalizeFrenchDate(
    new Intl.DateTimeFormat('fr-CH', {
      ...longDateParts,
      weekday: 'short',
      month: 'short',
      ...timeParts,
    }).format(date),
  )

/**
 * « 17.08.26 13:30 » — l'horodatage des journaux de l'administration.
 *
 * Écrit en parts explicites plutôt qu'avec `dateStyle`/`timeStyle` : les
 * raccourcis d'ICU rendent la même chose ici, mais imposent leur ponctuation
 * ailleurs, et c'est ainsi qu'une même date finissait par s'écrire de quatre
 * façons selon l'écran.
 */
export const formatShortMoment = (date: Date): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: RESERVATION_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    ...timeParts,
  }).format(date)

export const formatSlotTime = (date: Date): string =>
  formatInTimeZone(date, RESERVATION_TIME_ZONE, 'HH:mm')
