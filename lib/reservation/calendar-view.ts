import type { AvailabilityDayState } from '@/lib/reservation/availability'

/**
 * Mises en forme des clés de date (`'YYYY-MM-DD'`), pour les calendriers et les
 * en-têtes de journée.
 *
 * Une clé de date ne porte ni heure ni fuseau : elle est lue à midi UTC, ce qui
 * la place le bon jour quelle que soit la saison. Les dates rattachées à un
 * instant précis relèvent de `lib/reservation/time.ts`, pas d'ici.
 */

export const availabilityStateLabels: Record<AvailabilityDayState, string> = {
  AVAILABLE: 'Disponible',
  ON_REQUEST: 'Sur demande',
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

/** « 17 août 2026 » — une date sans jour de la semaine. */
export const formatCalendarDayDate = (dateKey: string): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDateKey(dateKey))

/** « lun. 17 août 2026 » — pour les listes d'occurrences. */
export const formatCalendarShortDate = (dateKey: string): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(parseDateKey(dateKey))
    .replace(',', '')

/** « lun. 17 août » ou « lundi 17 août » — en-tête d'une journée d'agenda. */
export const formatCalendarDayTitle = (dateKey: string, long = false): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'UTC',
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: long ? 'long' : 'short',
  })
    .format(parseDateKey(dateKey))
    .replace(',', '')

/**
 * Ramène une clé de date dans la fenêtre réservable.
 *
 * Le calendrier de déplacement s'ouvre sur la semaine du rendez-vous en cours,
 * qui peut tomber hors fenêtre : un rendez-vous très proche précède la première
 * date encore réservable, un rendez-vous lointain dépasse la dernière semaine
 * complète.
 */
export const clampDateKey = (
  candidate: string,
  minDateKey: string,
  maxDateKey: string,
): string =>
  candidate < minDateKey
    ? minDateKey
    : candidate > maxDateKey
      ? maxDateKey
      : candidate

/** « août 2026 », à partir d'une clé de mois `'YYYY-MM'`. */
export const formatCalendarMonth = (monthKey: string): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(parseDateKey(`${monthKey}-01`))

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
