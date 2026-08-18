import { formatInTimeZone } from 'date-fns-tz'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { getLocalDayBounds, getLocalDayOfWeek } from '@/lib/reservation/time'
import type { AppointmentStatus } from '@/prisma/generated/prisma/enums'

export interface TimelineInterval {
  startMinute: number
  endMinute: number
}

interface AdminTimelineException extends TimelineInterval {
  id: string
  type: 'AVAILABLE' | 'UNAVAILABLE'
  label: string | null
}

interface AdminTimelineAppointment extends TimelineInterval {
  id: string
  startsAt: Date
  occupiedStartMinute: number
  occupiedEndMinute: number
  preparationMinutes: number
  cleanupMinutes: number
  customerName: string
  customerPhone: string | null
  /** `null` pour les rendez-vous anciens que rien ne rattache à une fiche. */
  customerId: string | null
  serviceLabel: string
  serviceColor: string
  source: 'PUBLIC' | 'ADMIN'
  status: AppointmentStatus
  hasVisualOverlap: boolean
}

export interface AdminTimelineDay {
  dateKey: string
  dayOfWeek: number
  label: string
  shortLabel: string
  dayNumber: string
  isToday: boolean
  openings: TimelineInterval[]
  exceptions: AdminTimelineException[]
  appointments: AdminTimelineAppointment[]
  timelineStartMinute: number
  timelineEndMinute: number
}

interface WeeklyRangeInput extends TimelineInterval {
  dayOfWeek: number
}

interface ExceptionInput {
  id: string
  type: 'AVAILABLE' | 'UNAVAILABLE'
  startsAt: Date
  endsAt: Date
  label: string | null
}

interface AppointmentInput {
  id: string
  startsAt: Date
  endsAt: Date
  occupiedStartsAt: Date
  occupiedEndsAt: Date
  preparationMinutes: number
  cleanupMinutes: number
  customerName: string
  customerPhone: string | null
  customerId: string | null
  serviceLabel: string
  serviceColor: string
  source: 'PUBLIC' | 'ADMIN'
  status: AppointmentStatus
}

interface BuildTimelineDayOptions {
  dateKey: string
  today: string
  label: string
  shortLabel: string
  weekly: WeeklyRangeInput[]
  exceptions: ExceptionInput[]
  appointments: AppointmentInput[]
}

const MINUTES_PER_DAY = 24 * 60
const DEFAULT_START_MINUTE = 8 * 60
const DEFAULT_END_MINUTE = 18 * 60

const mergeMinuteIntervals = (
  intervals: TimelineInterval[],
): TimelineInterval[] => {
  const sorted = intervals
    .filter(interval => interval.startMinute < interval.endMinute)
    .sort((first, second) => first.startMinute - second.startMinute)
  const merged: TimelineInterval[] = []
  for (const interval of sorted) {
    const previous = merged.at(-1)
    if (!previous || interval.startMinute > previous.endMinute)
      merged.push({ ...interval })
    else if (interval.endMinute > previous.endMinute)
      previous.endMinute = interval.endMinute
  }
  return merged
}

const overlaps = (first: TimelineInterval, second: TimelineInterval): boolean =>
  first.startMinute < second.endMinute && first.endMinute > second.startMinute

const minuteInDay = (date: Date, dateKey: string): number => {
  const { start, end } = getLocalDayBounds(dateKey)
  if (date <= start) return 0
  if (date >= end) return MINUTES_PER_DAY
  return (
    Number(formatInTimeZone(date, RESERVATION_TIME_ZONE, 'H')) * 60 +
    Number(formatInTimeZone(date, RESERVATION_TIME_ZONE, 'm'))
  )
}

const getTimelineBounds = (
  openings: TimelineInterval[],
  appointments: AdminTimelineAppointment[],
): TimelineInterval => {
  const relevant = [
    ...openings,
    ...appointments.map(appointment => ({
      startMinute: appointment.occupiedStartMinute,
      endMinute: appointment.occupiedEndMinute,
    })),
  ]
  if (!relevant.length)
    return {
      startMinute: DEFAULT_START_MINUTE,
      endMinute: DEFAULT_END_MINUTE,
    }

  const earliest = Math.min(...relevant.map(interval => interval.startMinute))
  const latest = Math.max(...relevant.map(interval => interval.endMinute))
  return {
    startMinute: Math.max(0, Math.floor((earliest - 30) / 60) * 60),
    endMinute: Math.min(MINUTES_PER_DAY, Math.ceil((latest + 30) / 60) * 60),
  }
}

export const buildAdminTimelineDay = ({
  dateKey,
  today,
  label,
  shortLabel,
  weekly,
  exceptions,
  appointments,
}: BuildTimelineDayOptions): AdminTimelineDay => {
  const { start, end } = getLocalDayBounds(dateKey)
  const dailyExceptions = exceptions
    .filter(exception => exception.startsAt < end && exception.endsAt > start)
    .map(exception => ({
      id: exception.id,
      type: exception.type,
      label: exception.label,
      startMinute: minuteInDay(exception.startsAt, dateKey),
      endMinute: minuteInDay(exception.endsAt, dateKey),
    }))
  const openings = mergeMinuteIntervals([
    ...weekly
      .filter(range => range.dayOfWeek === getLocalDayOfWeek(dateKey))
      .map(range => ({
        startMinute: range.startMinute,
        endMinute: range.endMinute,
      })),
    ...dailyExceptions.filter(exception => exception.type === 'AVAILABLE'),
  ])
  const mappedAppointments = appointments
    .filter(
      appointment =>
        appointment.occupiedStartsAt < end &&
        appointment.occupiedEndsAt > start,
    )
    .map(appointment => ({
      id: appointment.id,
      startsAt: appointment.startsAt,
      startMinute: minuteInDay(appointment.startsAt, dateKey),
      endMinute: minuteInDay(appointment.endsAt, dateKey),
      occupiedStartMinute: minuteInDay(appointment.occupiedStartsAt, dateKey),
      occupiedEndMinute: minuteInDay(appointment.occupiedEndsAt, dateKey),
      preparationMinutes: appointment.preparationMinutes,
      cleanupMinutes: appointment.cleanupMinutes,
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      customerId: appointment.customerId,
      serviceLabel: appointment.serviceLabel,
      serviceColor: appointment.serviceColor,
      source: appointment.source,
      status: appointment.status,
      hasVisualOverlap: false,
    }))
  const timelineAppointments = mappedAppointments.map((appointment, index) => ({
    ...appointment,
    hasVisualOverlap:
      appointment.status === 'CONFIRMED' &&
      mappedAppointments.some(
        (other, otherIndex) =>
          other.status === 'CONFIRMED' &&
          otherIndex !== index &&
          overlaps(
            {
              startMinute: appointment.occupiedStartMinute,
              endMinute: appointment.occupiedEndMinute,
            },
            {
              startMinute: other.occupiedStartMinute,
              endMinute: other.occupiedEndMinute,
            },
          ),
      ),
  }))
  const bounds = getTimelineBounds(openings, timelineAppointments)

  return {
    dateKey,
    dayOfWeek: getLocalDayOfWeek(dateKey),
    label,
    shortLabel,
    dayNumber: dateKey.slice(-2).replace(/^0/, ''),
    isToday: dateKey === today,
    openings,
    exceptions: dailyExceptions,
    appointments: timelineAppointments,
    timelineStartMinute: bounds.startMinute,
    timelineEndMinute: bounds.endMinute,
  }
}

export const getFreeTimelineStarts = (day: AdminTimelineDay): number[] => {
  const closures = day.exceptions.filter(
    exception => exception.type === 'UNAVAILABLE',
  )
  const occupied = day.appointments
    .filter(appointment => appointment.status === 'CONFIRMED')
    .map(appointment => ({
      startMinute: appointment.occupiedStartMinute,
      endMinute: appointment.occupiedEndMinute,
    }))
  const starts: number[] = []

  for (
    let minute = day.timelineStartMinute;
    minute + 30 <= day.timelineEndMinute;
    minute += 30
  ) {
    const candidate = { startMinute: minute, endMinute: minute + 30 }
    const insideOpening = day.openings.some(
      opening =>
        candidate.startMinute >= opening.startMinute &&
        candidate.endMinute <= opening.endMinute,
    )
    if (!insideOpening) continue
    if (closures.some(closure => overlaps(closure, candidate))) continue
    if (occupied.some(interval => overlaps(interval, candidate))) continue
    starts.push(minute)
  }

  return starts
}

export const formatTimelineMinute = (minute: number): string =>
  `${Math.floor(minute / 60)
    .toString()
    .padStart(2, '0')}:${(minute % 60).toString().padStart(2, '0')}`

export const isAdminAppointmentTime = (value: string): boolean => {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return false
  const hour = Number(match[1])
  const minute = Number(match[2])
  return (
    hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && minute % 15 === 0
  )
}
