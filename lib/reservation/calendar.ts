import { contact } from '@/lib/constants/contact'

interface CalendarAppointment {
  id: string
  serviceName: string
  startsAt: Date
  endsAt: Date
}

const formatIcsDate = (date: Date): string =>
  date.toISOString().replaceAll(/[-:]/g, '').replace('.000', '')

const escapeIcs = (value: string): string =>
  value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')

export const createAppointmentCalendar = ({
  id,
  serviceName,
  startsAt,
  endsAt,
}: CalendarAppointment): string =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arbeauté//Rendez-vous//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${id}@arbeaute-bulle.ch`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startsAt)}`,
    `DTEND:${formatIcsDate(endsAt)}`,
    `SUMMARY:${escapeIcs(serviceName)} — Arbeauté`,
    `LOCATION:${escapeIcs(contact.address)}`,
    `DESCRIPTION:${escapeIcs(`Gérer mes rendez-vous : ${contact.website}/mes-rendez-vous`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
