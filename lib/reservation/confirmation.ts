import { contact } from '@/lib/constants/contact'

interface ConfirmationAppointment {
  /**
   * Le libellé complet, groupe compris — voir `formatServiceLabel`. Le nom seul
   * est ambigu : trois groupes proposent une prestation « Visage ».
   */
  serviceLabel: string
  dateLabel: string
  startsAt: string
  endsAt: string
}

const formatCalendarDate = (value: string): string =>
  new Date(value).toISOString().replaceAll(/[-:]/g, '').replace('.000', '')

export const createAppointmentDetails = ({
  serviceLabel,
  dateLabel,
}: Pick<ConfirmationAppointment, 'serviceLabel' | 'dateLabel'>): string =>
  [
    `Rendez-vous chez ${contact.name}`,
    `Soin : ${serviceLabel}`,
    `Horaire : ${dateLabel}`,
    `Adresse : ${contact.address}`,
    `Téléphone : ${contact.phone}`,
    `Mes rendez-vous : ${contact.website}/mes-rendez-vous`,
  ].join('\n')

export const createGoogleCalendarUrl = ({
  serviceLabel,
  startsAt,
  endsAt,
}: Omit<ConfirmationAppointment, 'dateLabel'>): string => {
  const parameters = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${serviceLabel} — ${contact.name}`,
    dates: `${formatCalendarDate(startsAt)}/${formatCalendarDate(endsAt)}`,
    details: `Rendez-vous chez ${contact.name}.\nTéléphone : ${contact.phone}\nGérer mes rendez-vous : ${contact.website}/mes-rendez-vous`,
    location: contact.address,
  })

  return `https://calendar.google.com/calendar/render?${parameters.toString()}`
}
