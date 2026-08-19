import { contact } from '@/lib/constants/contact'

interface CalendarAppointment {
  id: string
  /**
   * Le libellé complet, groupe compris, tel que `formatServiceLabel` le
   * construit. Jamais `serviceNameSnapshot` seul : « Visage » existe dans
   * trois groupes, et un événement d'agenda nommé « Visage — Arbeauté » ne dit
   * pas lequel.
   */
  serviceLabel: string
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

const textEncoder = new TextEncoder()

/**
 * RFC 5545 limite chaque ligne à 75 octets. Le découpage tient compte des
 * caractères accentués et réserve un octet à l'espace de continuation.
 */
const foldIcsLine = (line: string): string => {
  const folded: string[] = []
  let segment = ''
  let segmentBytes = 0

  for (const character of line) {
    const characterBytes = textEncoder.encode(character).length
    const maxBytes = folded.length === 0 ? 75 : 74
    if (segment && segmentBytes + characterBytes > maxBytes) {
      folded.push(folded.length === 0 ? segment : ` ${segment}`)
      segment = character
      segmentBytes = characterBytes
    } else {
      segment += character
      segmentBytes += characterBytes
    }
  }

  folded.push(folded.length === 0 ? segment : ` ${segment}`)
  return folded.join('\r\n')
}

export const createAppointmentCalendar = ({
  id,
  serviceLabel,
  startsAt,
  endsAt,
}: CalendarAppointment): string => {
  const description = [
    `Rendez-vous chez ${contact.name}.`,
    `Adresse : ${contact.address}`,
    `Téléphone : ${contact.phone}`,
    `Gérer mes rendez-vous : ${contact.website}/mes-rendez-vous`,
  ].join('\n')

  return [
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
    `SUMMARY:${escapeIcs(`${serviceLabel} — ${contact.name}`)}`,
    `LOCATION:${escapeIcs(contact.address)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ]
    .map(foldIcsLine)
    .join('\r\n')
}
