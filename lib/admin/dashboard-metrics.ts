import {
  getLocalDateKey,
  getLocalDayBounds,
  getLocalDayOfWeek,
  localDateMinuteToUtc,
} from '@/lib/reservation/time'
import type {
  AppointmentStatus,
  AvailabilityExceptionType,
} from '@/prisma/generated/prisma/enums'

interface Interval {
  start: Date
  end: Date
}

interface DashboardAppointment {
  startsAt: Date
  occupiedStartsAt: Date
  occupiedEndsAt: Date
  serviceDurationMinutes: number
  servicePriceCents: number
  status: AppointmentStatus
}

interface DashboardWeeklyRange {
  dayOfWeek: number
  startMinute: number
  endMinute: number
}

interface DashboardException {
  type: AvailabilityExceptionType
  startsAt: Date
  endsAt: Date
}

export interface DashboardMetrics {
  selectedDayCount: number
  bookedMinutes: number
  plannedRevenueCents: number
  occupancyRate: number | null
  noShowCount: number
}

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

const subtractIntervals = (
  openings: Interval[],
  closures: Interval[],
): Interval[] => {
  let remaining = mergeIntervals(openings)
  for (const closure of mergeIntervals(closures)) {
    remaining = remaining.flatMap(opening => {
      if (closure.end <= opening.start || closure.start >= opening.end)
        return [opening]
      const pieces: Interval[] = []
      if (closure.start > opening.start)
        pieces.push({ start: opening.start, end: closure.start })
      if (closure.end < opening.end)
        pieces.push({ start: closure.end, end: opening.end })
      return pieces
    })
  }
  return remaining
}

const clippedInterval = (
  interval: Interval,
  bounds: Interval,
): Interval | null => {
  const start = interval.start < bounds.start ? bounds.start : interval.start
  const end = interval.end > bounds.end ? bounds.end : interval.end
  return start < end ? { start, end } : null
}

const sumMinutes = (intervals: Interval[]): number =>
  Math.round(
    mergeIntervals(intervals).reduce(
      (total, interval) =>
        total + interval.end.getTime() - interval.start.getTime(),
      0,
    ) / 60_000,
  )

export const buildDashboardMetrics = ({
  anchorDateKey,
  dateKeys,
  appointments,
  weekly,
  exceptions,
}: {
  anchorDateKey: string
  dateKeys: string[]
  appointments: DashboardAppointment[]
  weekly: DashboardWeeklyRange[]
  exceptions: DashboardException[]
}): DashboardMetrics => {
  const firstDateKey = dateKeys[0]
  const lastDateKey = dateKeys.at(-1)
  if (!firstDateKey || !lastDateKey)
    return {
      selectedDayCount: 0,
      bookedMinutes: 0,
      plannedRevenueCents: 0,
      occupancyRate: null,
      noShowCount: 0,
    }
  const weekBounds = {
    start: getLocalDayBounds(firstDateKey).start,
    end: getLocalDayBounds(lastDateKey).end,
  }
  const openIntervals = dateKeys.flatMap(dateKey => {
    const dayBounds = getLocalDayBounds(dateKey)
    const exceptionsToday = exceptions.filter(
      exception =>
        exception.startsAt < dayBounds.end &&
        exception.endsAt > dayBounds.start,
    )
    const openings = [
      ...weekly
        .filter(range => range.dayOfWeek === getLocalDayOfWeek(dateKey))
        .map(range => ({
          start: localDateMinuteToUtc(dateKey, range.startMinute),
          end: localDateMinuteToUtc(dateKey, range.endMinute),
        })),
      ...exceptionsToday
        .filter(exception => exception.type === 'AVAILABLE')
        .map(exception =>
          clippedInterval(
            { start: exception.startsAt, end: exception.endsAt },
            dayBounds,
          ),
        )
        .filter((interval): interval is Interval => Boolean(interval)),
    ]
    const closures = exceptionsToday
      .filter(exception => exception.type === 'UNAVAILABLE')
      .map(exception =>
        clippedInterval(
          { start: exception.startsAt, end: exception.endsAt },
          dayBounds,
        ),
      )
      .filter((interval): interval is Interval => Boolean(interval))
    return subtractIntervals(openings, closures)
  })
  const occupiedIntervals = appointments
    .map(appointment =>
      clippedInterval(
        {
          start: appointment.occupiedStartsAt,
          end: appointment.occupiedEndsAt,
        },
        weekBounds,
      ),
    )
    .filter((interval): interval is Interval => Boolean(interval))
  const openMinutes = sumMinutes(openIntervals)
  const occupiedMinutes = sumMinutes(occupiedIntervals)

  return {
    selectedDayCount: appointments.filter(
      appointment => getLocalDateKey(appointment.startsAt) === anchorDateKey,
    ).length,
    bookedMinutes: appointments.reduce(
      (total, appointment) => total + appointment.serviceDurationMinutes,
      0,
    ),
    plannedRevenueCents: appointments
      .filter(
        appointment =>
          appointment.status === 'CONFIRMED' ||
          appointment.status === 'COMPLETED',
      )
      .reduce((total, appointment) => total + appointment.servicePriceCents, 0),
    occupancyRate:
      openMinutes > 0
        ? Math.min(100, Math.round((occupiedMinutes / openMinutes) * 100))
        : null,
    noShowCount: appointments.filter(
      appointment => appointment.status === 'NO_SHOW',
    ).length,
  }
}
