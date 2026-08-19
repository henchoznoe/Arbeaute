import { formatInTimeZone } from 'date-fns-tz'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import {
  addLocalDays,
  getLocalDateKey,
  getLocalDayBounds,
  getLocalDayOfWeek,
  isDateKey,
} from '@/lib/reservation/time'
import type { AvailabilityExceptionType } from '@/prisma/generated/prisma/enums'

export interface AvailabilityExceptionInput {
  id: string
  groupId: string
  type: AvailabilityExceptionType
  startsAt: Date
  endsAt: Date
  label: string | null
}

export interface AvailabilityCalendarSegment {
  id: string
  groupId: string
  dateKey: string
  type: AvailabilityExceptionType
  startMinute: number
  endMinute: number
  label: string | null
  allDay: boolean
}

export interface AvailabilityExceptionGroup {
  groupId: string
  type: AvailabilityExceptionType
  label: string | null
  from: string
  to: string
  dayCount: number
  rowCount: number
  timeLabels: string[]
}

const MONTH_PATTERN = /^\d{4}-\d{2}$/

export const isMonthKey = (value: string): boolean =>
  MONTH_PATTERN.test(value) && isDateKey(`${value}-01`)

export const addLocalMonths = (monthKey: string, amount: number): string => {
  if (!isMonthKey(monthKey)) throw new Error('Invalid month')
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1 + amount, 1))
    .toISOString()
    .slice(0, 7)
}

export const getMonthCalendarDateKeys = (monthKey: string): string[] => {
  if (!isMonthKey(monthKey)) throw new Error('Invalid month')
  const first = `${monthKey}-01`
  const mondayOffset =
    getLocalDayOfWeek(first) === 0 ? -6 : 1 - getLocalDayOfWeek(first)
  const gridStart = addLocalDays(first, mondayOffset)
  return Array.from({ length: 42 }, (_, index) =>
    addLocalDays(gridStart, index),
  )
}

const minuteInLocalDay = (date: Date): number =>
  Number(formatInTimeZone(date, RESERVATION_TIME_ZONE, 'H')) * 60 +
  Number(formatInTimeZone(date, RESERVATION_TIME_ZONE, 'm'))

export const toAvailabilityCalendarSegment = (
  exception: AvailabilityExceptionInput,
): AvailabilityCalendarSegment => {
  const dateKey = getLocalDateKey(exception.startsAt)
  const bounds = getLocalDayBounds(dateKey)
  const allDay =
    exception.startsAt.getTime() === bounds.start.getTime() &&
    exception.endsAt.getTime() === bounds.end.getTime()
  return {
    id: exception.id,
    groupId: exception.groupId,
    dateKey,
    type: exception.type,
    startMinute: allDay ? 0 : minuteInLocalDay(exception.startsAt),
    endMinute: allDay ? 24 * 60 : minuteInLocalDay(exception.endsAt),
    label: exception.label,
    allDay,
  }
}

const minuteLabel = (minute: number): string =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(
    minute % 60,
  ).padStart(2, '0')}`

export const groupAvailabilityExceptions = (
  exceptions: AvailabilityExceptionInput[],
): AvailabilityExceptionGroup[] => {
  const grouped = new Map<string, AvailabilityCalendarSegment[]>()
  for (const exception of exceptions) {
    const segment = toAvailabilityCalendarSegment(exception)
    grouped.set(segment.groupId, [
      ...(grouped.get(segment.groupId) ?? []),
      segment,
    ])
  }
  return [...grouped.entries()]
    .map(([groupId, segments]) => {
      const sorted = segments.sort(
        (first, second) =>
          first.dateKey.localeCompare(second.dateKey) ||
          first.startMinute - second.startMinute,
      )
      const dateKeys = [...new Set(sorted.map(segment => segment.dateKey))]
      const timeLabels = [
        ...new Set(
          sorted.map(segment =>
            segment.allDay
              ? 'Journée entière'
              : `${minuteLabel(segment.startMinute)}–${minuteLabel(segment.endMinute)}`,
          ),
        ),
      ]
      const first = sorted[0]
      return {
        groupId,
        type: first?.type ?? 'UNAVAILABLE',
        label: first?.label ?? null,
        from: dateKeys[0] ?? '',
        to: dateKeys.at(-1) ?? '',
        dayCount: dateKeys.length,
        rowCount: sorted.length,
        timeLabels,
      }
    })
    .sort((first, second) => first.from.localeCompare(second.from))
}

export const hasAvailabilityExceptionOverlap = (
  proposed: Array<
    Pick<AvailabilityCalendarSegment, 'dateKey' | 'startMinute' | 'endMinute'>
  >,
  existing: Array<
    Pick<AvailabilityCalendarSegment, 'dateKey' | 'startMinute' | 'endMinute'>
  >,
): boolean =>
  proposed.some(candidate =>
    existing.some(
      exception =>
        candidate.dateKey === exception.dateKey &&
        candidate.startMinute < exception.endMinute &&
        candidate.endMinute > exception.startMinute,
    ),
  )

type AvailabilityExceptionKind = AvailabilityCalendarSegment['type']

const exceptionKindNouns: Record<AvailabilityExceptionKind, string> = {
  AVAILABLE: 'ouverture',
  UNAVAILABLE: 'fermeture',
}

/**
 * Le nom de ce qu'un jour particulier ajoute ou retire.
 *
 * Une ouverture exceptionnelle et des vacances sont l'inverse l'une de l'autre,
 * et dans une pastille de 27 px « 1 ouv. » comme « 1 ferm. » s'affichaient
 * « 1 … » : seule la couleur de fond les distinguait encore, ce que la première
 * règle de `docs/systeme-visuel.md` interdit. Le nombre et une icône explicite
 * restent visibles ; le nom revient dès que la cellule est assez large.
 */
export const getExceptionCountNoun = (
  count: number,
  kind: AvailabilityExceptionKind,
): string => `${exceptionKindNouns[kind]}${count > 1 ? 's' : ''}`

const describeExceptionCount = (
  count: number,
  kind: AvailabilityExceptionKind,
): string => `${count} ${getExceptionCountNoun(count, kind)}`

/** Ce que la cellule annonce en entier aux technologies d'assistance. */
export const describeExceptionDay = (
  dateLabel: string,
  openings: number,
  closures: number,
): string =>
  [
    dateLabel,
    ...(openings > 0 ? [describeExceptionCount(openings, 'AVAILABLE')] : []),
    ...(closures > 0 ? [describeExceptionCount(closures, 'UNAVAILABLE')] : []),
  ].join(', ')
