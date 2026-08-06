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

export const canCustomerChangeAppointment = (
  startsAt: Date,
  now = new Date(),
): boolean => startsAt.getTime() - now.getTime() >= CUSTOMER_CHANGE_CUTOFF_MS

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
