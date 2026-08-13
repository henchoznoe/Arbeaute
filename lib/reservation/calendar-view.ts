import type { AvailabilityDayState } from '@/lib/reservation/availability'

export const availabilityStateLabels: Record<AvailabilityDayState, string> = {
  AVAILABLE: 'Disponible',
  FULL: 'Complet',
  CLOSED: 'Fermé',
}

const parseDateKey = (dateKey: string): Date =>
  new Date(`${dateKey}T12:00:00.000Z`)

export const formatCalendarWeekday = (dateKey: string): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'UTC',
    weekday: 'short',
  })
    .format(parseDateKey(dateKey))
    .replace('.', '')

export const formatCalendarDayNumber = (dateKey: string): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'UTC',
    day: 'numeric',
  }).format(parseDateKey(dateKey))

export const formatCalendarDate = (dateKey: string): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(parseDateKey(dateKey))
    .replace(',', '')

export const formatCalendarPeriod = (
  fromDateKey: string,
  toDateKey: string,
): string => {
  const from = parseDateKey(fromDateKey)
  const to = parseDateKey(toDateKey)
  const fromYear = from.getUTCFullYear()
  const toYear = to.getUTCFullYear()
  const fromMonth = from.getUTCMonth()
  const toMonth = to.getUTCMonth()

  if (fromYear === toYear && fromMonth === toMonth)
    return `${from.getUTCDate()}–${to.getUTCDate()} ${new Intl.DateTimeFormat(
      'fr-CH',
      { timeZone: 'UTC', month: 'long', year: 'numeric' },
    ).format(to)}`

  const fromLabel = new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: fromYear === toYear ? undefined : 'numeric',
  }).format(from)
  const toLabel = new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(to)
  return `${fromLabel} – ${toLabel}`
}
