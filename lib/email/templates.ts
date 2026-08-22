import { contact } from '@/lib/constants/contact'
import { createGoogleCalendarUrl } from '@/lib/reservation/confirmation'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { buildManageUrl } from '@/lib/reservation/manage-link'
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
  endsAt: Date
  priceCents: number
  /** Ancien horaire, uniquement pour un déplacement. */
  previousStartsAt?: Date
  /**
   * L'adresse à laquelle le message part. Sert au lien « Déplacer ou annuler »,
   * qui ouvre alors la session sans ressaisie.
   *
   * Obligatoire, et non facultative : une signature tolérante laisserait passer
   * les appelants qui l'oublient, et le lien retomberait silencieusement sur
   * l'écran d'identification — le défaut exact qu'on corrige.
   */
  customerEmail: string | null
}

const BOOKING_URL = `${contact.website}${contact.bookingUrl}`

/**
 * Couleurs écrites en dur, et c'est volontaire : les variables CSS du système
 * visuel ne fonctionnent pas dans un client de messagerie. Les valeurs
 * reprennent les jetons `brand` — l'exception est consignée dans
 * `docs/systeme-visuel.md`.
 */
const BUTTON_BACKGROUND = '#9c5566'
const BUTTON_TEXT = '#ffffff'

interface MailAction {
  label: string
  url: string
}

/**
 * Boutons construits en tableau, jamais en `<a>` stylé : Outlook ignore la
 * plupart des styles posés sur un lien, et rendrait un texte nu.
 */
const actionsHtml = (actions: MailAction[]): string =>
  actions
    .map(
      action => `      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px">
        <tr>
          <td style="border-radius:10px;background:${BUTTON_BACKGROUND}">
            <a href="${escapeHtml(action.url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:${BUTTON_TEXT};text-decoration:none">${escapeHtml(action.label)}</a>
          </td>
        </tr>
      </table>`,
    )
    .join('\n')

/** Les mêmes actions en texte brut : une adresse écrite en toutes lettres. */
const actionsText = (actions: MailAction[]): string[] =>
  actions.flatMap(action => [`${action.label} : ${action.url}`])

const calendarAction = (data: AppointmentMailData): MailAction => ({
  label: 'Ajouter à mon agenda',
  url: createGoogleCalendarUrl({
    serviceLabel: data.serviceLabel,
    startsAt: data.startsAt.toISOString(),
    endsAt: data.endsAt.toISOString(),
  }),
})

/**
 * Le lien qui ramène à ses rendez-vous. Avec l'adresse du destinataire, il
 * ouvre la session sans rien redemander — voir `lib/reservation/manage-link.ts`
 * pour ce que cela coûte et pourquoi c'est accepté. Sans adresse, il retombe
 * sur l'écran d'identification ordinaire.
 */
const manageAction = (email?: string | null): MailAction => ({
  label: 'Déplacer ou annuler',
  url: buildManageUrl(contact.website, email),
})

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

const wrapHtml = (
  title: string,
  bodyLines: string[],
  actions: MailAction[] = [],
): string => {
  const paragraphs = bodyLines
    .map(line => `      <p style="margin:0 0 12px">${line}</p>`)
    .join('\n')
  const buttons = actions.length
    ? `\n      <div style="margin:20px 0 0">\n${actionsHtml(actions)}\n      </div>`
    : ''
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#faf7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#241c19;line-height:1.6">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9c5566">${escapeHtml(contact.name)}</p>
      <h1 style="margin:0 0 20px;font-size:22px;line-height:1.25">${escapeHtml(title)}</h1>
${paragraphs}${buttons}
      <hr style="margin:24px 0;border:none;border-top:1px solid #ece5e1" />
      <p style="margin:0;font-size:13px;color:#6d605b">
        ${escapeHtml(contact.name)} · ${escapeHtml(contact.address)}<br />
        ${escapeHtml(contact.phone)}<br />
        ${escapeHtml(replyNotice)}
      </p>
    </div>
  </body>
</html>`
}

/**
 * L'expéditeur ne reçoit rien : `reply_to` renvoie vers la boîte relevée. La
 * phrase le dit quand même, pour qui lit l'adresse d'expédition plutôt que
 * d'appuyer sur « Répondre ».
 */
const replyNotice = `Une question ? Répondez à ce message, il arrive sur ${contact.email}.`

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

/** Le pied de page en texte brut reprend ce que le HTML met en petit. */
const textFooter = [replyNotice, '', signOff]

export const buildConfirmationMail = (
  data: AppointmentMailData,
): MailContent => {
  const title = 'Votre rendez-vous est confirmé'
  const intro = `Bonjour ${greetingName(data)}, votre rendez-vous est bien enregistré.`
  // Le téléphone n'est plus demandé pour s'identifier depuis la v1.10 :
  // l'adresse e-mail suffit, et la promettre en plus enverrait quelqu'un
  // chercher une information dont on n'a pas besoin.
  const closing = `Pour le déplacer ou l’annuler, votre adresse e-mail suffit.`
  const actions = [calendarAction(data), manageAction(data.customerEmail)]

  return {
    subject: `Rendez-vous confirmé — ${formatMailDate(data.startsAt)} à ${formatMailTime(data.startsAt)}`,
    text: [
      intro,
      '',
      ...appointmentSummaryText(data),
      '',
      closing,
      ...actionsText(actions),
      '',
      ...textFooter,
    ].join('\n'),
    html: wrapHtml(
      title,
      [escapeHtml(intro), ...appointmentSummaryHtml(data), escapeHtml(closing)],
      actions,
    ),
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
  const actions = [calendarAction(data), manageAction(data.customerEmail)]

  return {
    subject: `Rendez-vous déplacé — ${formatMailDate(data.startsAt)} à ${formatMailTime(data.startsAt)}`,
    text: [
      intro,
      ...(previous ? ['', previous] : []),
      '',
      ...appointmentSummaryText(data),
      '',
      ...actionsText(actions),
      '',
      ...textFooter,
    ].join('\n'),
    html: wrapHtml(
      title,
      [
        escapeHtml(intro),
        ...(previous ? [escapeHtml(previous)] : []),
        ...appointmentSummaryHtml(data),
      ],
      actions,
    ),
  }
}

export const buildCancelledMail = (data: AppointmentMailData): MailContent => {
  const title = 'Votre rendez-vous a été annulé'
  const intro = `Bonjour ${greetingName(data)}, votre rendez-vous a bien été annulé.`
  const closing = 'Vous pouvez en reprendre un quand vous le souhaitez.'
  const actions = [{ label: 'Prendre un rendez-vous', url: BOOKING_URL }]

  return {
    subject: `Rendez-vous annulé — ${formatMailDate(data.startsAt)} à ${formatMailTime(data.startsAt)}`,
    text: [
      intro,
      '',
      `Soin : ${data.serviceLabel}`,
      `Était prévu le : ${formatMailDate(data.startsAt)} à ${formatMailTime(data.startsAt)}`,
      '',
      closing,
      ...actionsText(actions),
      '',
      ...textFooter,
    ].join('\n'),
    html: wrapHtml(
      title,
      [
        escapeHtml(intro),
        `<strong>Soin :</strong> ${escapeHtml(data.serviceLabel)}`,
        `<strong>Était prévu le :</strong> ${escapeHtml(`${formatMailDate(data.startsAt)} à ${formatMailTime(data.startsAt)}`)}`,
        escapeHtml(closing),
      ],
      actions,
    ),
  }
}

export interface AppointmentReminderMailData extends AppointmentMailData {
  /** Présente uniquement tant que le changement en ligne reste ouvert. */
  changeDeadline: Date | null
}

/**
 * Le rappel du matin de la veille, qui reste exact lors d'un rattrapage.
 *
 * « Demain » est volontairement absent : après une panne du cron, le même
 * gabarit peut partir le jour du rendez-vous sans annoncer une fausse date.
 */
export const buildAppointmentReminderMail = (
  data: AppointmentReminderMailData,
): MailContent => {
  const title = 'Votre rendez-vous approche'
  const intro = `Bonjour ${greetingName(data)}, un petit rappel pour votre rendez-vous chez ${contact.name}.`
  const canChange = data.changeDeadline !== null
  const closing = canChange
    ? `Vous pouvez le déplacer ou l’annuler en ligne jusqu’au ${formatMailDate(data.changeDeadline as Date)} à ${formatMailTime(data.changeDeadline as Date)}.`
    : `Un empêchement ? Répondez à ce message ou appelez-nous dès que possible au ${contact.phone}.`
  const actions = canChange ? [manageAction(data.customerEmail)] : []

  return {
    subject: `Rappel — votre rendez-vous ${formatMailDate(data.startsAt)} à ${formatMailTime(data.startsAt)}`,
    text: [
      intro,
      '',
      ...appointmentSummaryText(data),
      '',
      closing,
      ...actionsText(actions),
      '',
      ...textFooter,
    ].join('\n'),
    html: wrapHtml(
      title,
      [escapeHtml(intro), ...appointmentSummaryHtml(data), escapeHtml(closing)],
      actions,
    ),
  }
}

/**
 * Une série de rendez-vous, en **un** message.
 *
 * `createAdminAppointmentSeries` peut créer douze rendez-vous d'un coup. Douze
 * e-mails à la même personne épuiseraient le quota gratuit et seraient pénibles
 * à recevoir ; les occurrences tiennent dans une liste.
 */
export const buildSeriesConfirmationMail = (
  data: AppointmentMailData,
  occurrences: Date[],
): MailContent => {
  const title = `Vos ${occurrences.length} rendez-vous sont confirmés`
  const intro = `Bonjour ${greetingName(data)}, vos ${occurrences.length} rendez-vous sont bien enregistrés.`
  const closing =
    'Pour en déplacer un ou l’annuler, votre adresse e-mail suffit.'
  const actions = [manageAction(data.customerEmail)]
  const lines = occurrences.map(
    occurrence =>
      `${formatMailDate(occurrence)} à ${formatMailTime(occurrence)}`,
  )

  return {
    subject: `${occurrences.length} rendez-vous confirmés — à partir du ${formatMailDate(occurrences[0] ?? data.startsAt)}`,
    text: [
      intro,
      '',
      `Soin : ${data.serviceLabel}`,
      `Prix par séance : ${formatPrice(data.priceCents)}`,
      `Adresse : ${contact.address}`,
      '',
      ...lines,
      '',
      closing,
      ...actionsText(actions),
      '',
      ...textFooter,
    ].join('\n'),
    html: wrapHtml(
      title,
      [
        escapeHtml(intro),
        `<strong>Soin :</strong> ${escapeHtml(data.serviceLabel)}`,
        `<strong>Prix par séance :</strong> ${escapeHtml(formatPrice(data.priceCents))}`,
        `<strong>Adresse :</strong> ${escapeHtml(contact.address)}`,
        `<ul style="margin:0 0 12px;padding-left:20px">${lines
          .map(line => `<li>${escapeHtml(line)}</li>`)
          .join('')}</ul>`,
        escapeHtml(closing),
      ],
      actions,
    ),
  }
}

export interface WeeklyDigestData {
  /** « du lundi 10 au dimanche 16 août 2026 ». */
  periodLabel: string
  visitCount: number
  workedLabel: string
  revenueCents: number
  noShowCount: number
  topServiceLabel: string | null
  /** Rendez-vous confirmés de la semaine qui commence. */
  upcomingCount: number
}

/**
 * Le bilan du dimanche soir — le seul message qu'Arzu reçoit.
 *
 * Quatre réponses, pas davantage : combien de personnes, combien d'heures, quel
 * montant, et ce que contient la semaine qui vient. L'élément 12 de cette même
 * roadmap consiste précisément à retirer cinq compteurs d'un écran parce qu'ils
 * ne répondaient à aucune question ; ce message ne refait pas l'erreur.
 *
 * Les absences ne s'affichent que s'il y en a : un « 0 » mis en avant est une
 * accusation gratuite.
 */
export const buildWeeklyDigestMail = (data: WeeklyDigestData): MailContent => {
  const title = `Votre semaine ${data.periodLabel}`

  if (data.visitCount === 0)
    return {
      subject: `Semaine calme ${data.periodLabel}`,
      text: [
        'Bonjour Arzu,',
        '',
        `Aucun rendez-vous honoré ${data.periodLabel}.`,
        data.upcomingCount > 0
          ? `La semaine qui commence en compte ${data.upcomingCount}.`
          : 'Aucun rendez-vous n’est encore pris pour la semaine qui commence.',
        '',
        contact.name,
      ].join('\n'),
      html: wrapHtml(title, [
        `Aucun rendez-vous honoré ${escapeHtml(data.periodLabel)}.`,
        escapeHtml(
          data.upcomingCount > 0
            ? `La semaine qui commence en compte ${data.upcomingCount}.`
            : 'Aucun rendez-vous n’est encore pris pour la semaine qui commence.',
        ),
      ]),
    }

  const lines = [
    `Personnes reçues : ${data.visitCount}`,
    `Temps de soin : ${data.workedLabel}`,
    `Montant réalisé : ${formatPrice(data.revenueCents)}`,
    ...(data.topServiceLabel
      ? [`Soin le plus donné : ${data.topServiceLabel}`]
      : []),
    ...(data.noShowCount > 0 ? [`Absences notées : ${data.noShowCount}`] : []),
    `Semaine qui commence : ${data.upcomingCount} rendez-vous`,
  ]

  const actions = [
    { label: 'Ouvrir mon agenda', url: `${contact.website}/admin` },
  ]

  return {
    subject: `${data.visitCount} personnes reçues ${data.periodLabel}`,
    text: [
      'Bonjour Arzu,',
      '',
      `Voici votre semaine ${data.periodLabel}.`,
      '',
      ...lines,
      '',
      ...actionsText(actions),
      '',
      contact.name,
    ].join('\n'),
    html: wrapHtml(
      title,
      [
        `Voici votre semaine ${escapeHtml(data.periodLabel)}.`,
        ...lines.map(line => {
          const [label, ...rest] = line.split(' : ')
          return `<strong>${escapeHtml(label)} :</strong> ${escapeHtml(rest.join(' : '))}`
        }),
      ],
      actions,
    ),
  }
}

export interface LateRequestMailData {
  customerFirstName: string | null
  customerLastName: string
  customerPhone: string
  serviceLabel: string
  requestedStartsAt: Date
  priceCents: number
  comment?: string | null
  /** Voir `AppointmentMailData.customerEmail`. Obligatoire pour la même raison. */
  customerEmail: string | null
}

const lateRequestSummaryText = (data: LateRequestMailData): string[] => [
  `Soin : ${data.serviceLabel}`,
  `Date : ${formatMailDate(data.requestedStartsAt)}`,
  `Heure : ${formatMailTime(data.requestedStartsAt)}`,
  `Prix : ${formatPrice(data.priceCents)}`,
]

const lateRequestSummaryHtml = (data: LateRequestMailData): string[] => [
  `<strong>Soin :</strong> ${escapeHtml(data.serviceLabel)}`,
  `<strong>Date :</strong> ${escapeHtml(formatMailDate(data.requestedStartsAt))}`,
  `<strong>Heure :</strong> ${escapeHtml(formatMailTime(data.requestedStartsAt))}`,
  `<strong>Prix :</strong> ${escapeHtml(formatPrice(data.priceCents))}`,
]

const requesterName = (data: LateRequestMailData): string =>
  [data.customerFirstName?.trim(), data.customerLastName.trim()]
    .filter(Boolean)
    .join(' ')

/**
 * Le message qu'Arzu reçoit quand quelqu'un demande une heure trop proche.
 *
 * Le numéro y figure en toutes lettres : la réponse la plus rapide est souvent
 * un appel, et la faire revenir sur le site pour le retrouver serait un détour.
 */
export const buildLateRequestSubmittedMail = (
  data: LateRequestMailData,
): MailContent => {
  const title = 'Une demande de dernière minute'
  const intro = `${requesterName(data)} aimerait venir ${formatMailDate(data.requestedStartsAt)} à ${formatMailTime(data.requestedStartsAt)}.`
  const closing =
    'Rien n’est réservé tant que vous n’avez pas répondu. Le créneau reste libre pour quelqu’un d’autre entre-temps.'
  const actions = [
    {
      label: 'Répondre à la demande',
      url: `${contact.website}/admin/demandes`,
    },
  ]
  const lines = [
    ...lateRequestSummaryText(data),
    `Téléphone : ${data.customerPhone}`,
    ...(data.comment?.trim() ? [`Message : ${data.comment.trim()}`] : []),
  ]

  return {
    subject: `Demande pour ${formatMailDate(data.requestedStartsAt)} à ${formatMailTime(data.requestedStartsAt)}`,
    text: [
      'Bonjour Arzu,',
      '',
      intro,
      '',
      ...lines,
      '',
      closing,
      ...actionsText(actions),
      '',
      contact.name,
    ].join('\n'),
    html: wrapHtml(
      title,
      [
        escapeHtml(intro),
        ...lateRequestSummaryHtml(data),
        `<strong>Téléphone :</strong> ${escapeHtml(data.customerPhone)}`,
        ...(data.comment?.trim()
          ? [`<strong>Message :</strong> ${escapeHtml(data.comment.trim())}`]
          : []),
        escapeHtml(closing),
      ],
      actions,
    ),
  }
}

/**
 * L'accusé envoyé à la personne.
 *
 * Il dit deux fois, en deux endroits, que ce n'est pas encore un rendez-vous.
 * Un accusé qui ressemble à une confirmation est pire que pas d'accusé du tout :
 * quelqu'un se déplacerait pour rien.
 */
export const buildLateRequestReceivedMail = (
  data: LateRequestMailData,
): MailContent => {
  const title = 'Votre demande est bien arrivée'
  const intro = `Bonjour ${data.customerFirstName?.trim() || data.customerLastName.trim()}, votre demande a bien été transmise à ${contact.owner}.`
  const warning =
    'Ce n’est pas encore un rendez-vous : l’heure demandée est trop proche pour être réservée en ligne. Vous recevrez un message dès qu’elle aura répondu.'
  const closing = `Si c’est urgent, appelez directement le ${contact.phone}.`
  // « Mes rendez-vous » est l'endroit où l'on retire une demande : ne pas y
  // renvoyer laissait sans issue quelqu'un qui change d'avis.
  const actions = [
    {
      label: 'Voir ma demande',
      url: buildManageUrl(contact.website, data.customerEmail),
    },
  ]

  return {
    subject: `Demande reçue — ${formatMailDate(data.requestedStartsAt)} à ${formatMailTime(data.requestedStartsAt)}`,
    text: [
      intro,
      '',
      warning,
      '',
      ...lateRequestSummaryText(data),
      '',
      closing,
      ...actionsText(actions),
      '',
      ...textFooter,
    ].join('\n'),
    html: wrapHtml(
      title,
      [
        escapeHtml(intro),
        escapeHtml(warning),
        ...lateRequestSummaryHtml(data),
        escapeHtml(closing),
      ],
      actions,
    ),
  }
}

/**
 * Le refus.
 *
 * Court, sans justification inventée, et il rouvre immédiatement deux portes :
 * le téléphone et le calendrier. Un refus qui laisse sans suite donne
 * l'impression d'une porte fermée alors que l'institut reste ouvert.
 */
export const buildLateRequestDeclinedMail = (
  data: LateRequestMailData & { declineReason?: string | null },
): MailContent => {
  const title = 'Cette heure n’a pas pu être retenue'
  const intro = `Bonjour ${data.customerFirstName?.trim() || data.customerLastName.trim()}, ${contact.owner} ne peut malheureusement pas vous recevoir ${formatMailDate(data.requestedStartsAt)} à ${formatMailTime(data.requestedStartsAt)}.`
  // Sans le soin, quelqu'un qui a deux demandes en attente le même jour ne
  // sait pas laquelle est refusée. Une phrase suffit : un récapitulatif complet,
  // prix compris, serait déplacé dans un message de refus.
  const requested = `Votre demande portait sur ${data.serviceLabel}.`
  const reason = data.declineReason?.trim()
  const closing = `Il reste d’autres heures libres, et vous pouvez aussi appeler le ${contact.phone}.`
  const actions = [{ label: 'Voir les heures libres', url: BOOKING_URL }]

  return {
    subject: `Demande non retenue — ${formatMailDate(data.requestedStartsAt)}`,
    text: [
      intro,
      requested,
      ...(reason ? ['', reason] : []),
      '',
      closing,
      ...actionsText(actions),
      '',
      ...textFooter,
    ].join('\n'),
    html: wrapHtml(
      title,
      [
        escapeHtml(intro),
        escapeHtml(requested),
        ...(reason ? [escapeHtml(reason)] : []),
        escapeHtml(closing),
      ],
      actions,
    ),
  }
}
