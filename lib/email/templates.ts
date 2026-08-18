import { contact } from '@/lib/constants/contact'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { formatLongDate } from '@/lib/reservation/time'
import { formatPrice } from '@/lib/utils/format'

/**
 * Gabarits des e-mails transactionnels.
 *
 * Fonctions pures : aucune I/O, aucune dépendance à Prisma ni à Resend. Elles
 * produisent l'objet, la version texte et la version HTML, et sont donc
 * entièrement vérifiables par des tests unitaires.
 *
 * Le vocabulaire suit `docs/vocabulaire.md` : ce qui se lit ici est
 * écrit comme ce qu'elle lit à l'écran.
 */

export interface AppointmentMailData {
  customerFirstName: string | null
  customerLastName: string
  serviceLabel: string
  startsAt: Date
  priceCents: number
  /** Ancien horaire, uniquement pour un déplacement. */
  previousStartsAt?: Date
}

export interface MailContent {
  subject: string
  text: string
  html: string
}

const timeFormatter = new Intl.DateTimeFormat('fr-CH', {
  timeZone: RESERVATION_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

const formatMailDate = (date: Date): string => formatLongDate(date)
const formatMailTime = (date: Date): string => timeFormatter.format(date)

const greetingName = (data: AppointmentMailData): string =>
  data.customerFirstName?.trim() || data.customerLastName.trim()

/** Échappe le texte inséré dans le HTML : les noms viennent d'un formulaire. */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const wrapHtml = (title: string, bodyLines: string[]): string => {
  const paragraphs = bodyLines
    .map(line => `      <p style="margin:0 0 12px">${line}</p>`)
    .join('\n')
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#faf7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#241c19;line-height:1.6">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9c5566">${escapeHtml(contact.name)}</p>
      <h1 style="margin:0 0 20px;font-size:22px;line-height:1.25">${escapeHtml(title)}</h1>
${paragraphs}
      <hr style="margin:24px 0;border:none;border-top:1px solid #ece5e1" />
      <p style="margin:0;font-size:13px;color:#6d605b">
        ${escapeHtml(contact.name)} · ${escapeHtml(contact.address)}<br />
        ${escapeHtml(contact.phone)}
      </p>
    </div>
  </body>
</html>`
}

/** Bloc récapitulatif commun, en texte brut. */
const appointmentSummaryText = (data: AppointmentMailData): string[] => [
  `Soin : ${data.serviceLabel}`,
  `Date : ${formatMailDate(data.startsAt)}`,
  `Heure : ${formatMailTime(data.startsAt)}`,
  `Prix : ${formatPrice(data.priceCents)}`,
  `Adresse : ${contact.address}`,
]

const appointmentSummaryHtml = (data: AppointmentMailData): string[] => [
  `<strong>Soin :</strong> ${escapeHtml(data.serviceLabel)}`,
  `<strong>Date :</strong> ${escapeHtml(formatMailDate(data.startsAt))}`,
  `<strong>Heure :</strong> ${escapeHtml(formatMailTime(data.startsAt))}`,
  `<strong>Prix :</strong> ${escapeHtml(formatPrice(data.priceCents))}`,
  `<strong>Adresse :</strong> ${escapeHtml(contact.address)}`,
]

const signOff = `À bientôt,\n${contact.owner} — ${contact.name}`

export const buildConfirmationMail = (
  data: AppointmentMailData,
): MailContent => {
  const title = 'Votre rendez-vous est confirmé'
  const intro = `Bonjour ${greetingName(data)}, votre rendez-vous est bien enregistré.`
  const closing = `Pour le déplacer ou l’annuler, rendez-vous sur ${contact.website}/mes-rendez-vous avec l’adresse e-mail et le numéro de téléphone utilisés lors de la réservation.`

  return {
    subject: `Rendez-vous confirmé — ${formatMailDate(data.startsAt)} à ${formatMailTime(data.startsAt)}`,
    text: [
      intro,
      '',
      ...appointmentSummaryText(data),
      '',
      closing,
      '',
      signOff,
    ].join('\n'),
    html: wrapHtml(title, [
      escapeHtml(intro),
      ...appointmentSummaryHtml(data),
      escapeHtml(closing),
    ]),
  }
}

export const buildRescheduledMail = (
  data: AppointmentMailData,
): MailContent => {
  const title = 'Votre rendez-vous a été déplacé'
  const previous = data.previousStartsAt
    ? `Ancien horaire : ${formatMailDate(data.previousStartsAt)} à ${formatMailTime(data.previousStartsAt)}.`
    : null
  const intro = `Bonjour ${greetingName(data)}, votre rendez-vous a bien été déplacé.`

  return {
    subject: `Rendez-vous déplacé — ${formatMailDate(data.startsAt)} à ${formatMailTime(data.startsAt)}`,
    text: [
      intro,
      ...(previous ? ['', previous] : []),
      '',
      ...appointmentSummaryText(data),
      '',
      signOff,
    ].join('\n'),
    html: wrapHtml(title, [
      escapeHtml(intro),
      ...(previous ? [escapeHtml(previous)] : []),
      ...appointmentSummaryHtml(data),
    ]),
  }
}

export const buildCancelledMail = (data: AppointmentMailData): MailContent => {
  const title = 'Votre rendez-vous a été annulé'
  const intro = `Bonjour ${greetingName(data)}, votre rendez-vous a bien été annulé.`
  const closing = `Vous pouvez en reprendre un quand vous le souhaitez sur ${contact.website}${contact.bookingUrl}.`

  return {
    subject: `Rendez-vous annulé — ${formatMailDate(data.startsAt)} à ${formatMailTime(data.startsAt)}`,
    text: [
      intro,
      '',
      `Soin : ${data.serviceLabel}`,
      `Était prévu le : ${formatMailDate(data.startsAt)} à ${formatMailTime(data.startsAt)}`,
      '',
      closing,
      '',
      signOff,
    ].join('\n'),
    html: wrapHtml(title, [
      escapeHtml(intro),
      `<strong>Soin :</strong> ${escapeHtml(data.serviceLabel)}`,
      `<strong>Était prévu le :</strong> ${escapeHtml(`${formatMailDate(data.startsAt)} à ${formatMailTime(data.startsAt)}`)}`,
      escapeHtml(closing),
    ]),
  }
}
