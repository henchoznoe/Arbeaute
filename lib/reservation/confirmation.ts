import { contact } from '@/lib/constants/contact'

interface ConfirmationAppointment {
  serviceName: string
  dateLabel: string
  startsAt: string
  endsAt: string
}

const formatCalendarDate = (value: string): string =>
  new Date(value).toISOString().replaceAll(/[-:]/g, '').replace('.000', '')

export const createAppointmentDetails = ({
  serviceName,
  dateLabel,
}: Pick<ConfirmationAppointment, 'serviceName' | 'dateLabel'>): string =>
  [
    `Rendez-vous chez ${contact.name}`,
    `Soin : ${serviceName}`,
    `Horaire : ${dateLabel}`,
    `Adresse : ${contact.address}`,
    `Téléphone : ${contact.phone}`,
    `Mes rendez-vous : ${contact.website}/mes-rendez-vous`,
  ].join('\n')

export const createGoogleCalendarUrl = ({
  serviceName,
  startsAt,
  endsAt,
}: Omit<ConfirmationAppointment, 'dateLabel'>): string => {
  const parameters = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${serviceName} — ${contact.name}`,
    dates: `${formatCalendarDate(startsAt)}/${formatCalendarDate(endsAt)}`,
    details: `Rendez-vous chez ${contact.name}.\nTéléphone : ${contact.phone}\nGérer mes rendez-vous : ${contact.website}/mes-rendez-vous`,
    location: contact.address,
  })

  return `https://calendar.google.com/calendar/render?${parameters.toString()}`
}
