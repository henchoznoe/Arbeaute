/**
 * Faut-il écrire à la personne après un changement décidé par Arzu ?
 *
 * Fonction pure, sans base de données : c'est la décision elle-même qui doit
 * être vérifiable, pas la plomberie qui l'exécute.
 *
 * La règle tient en une phrase : **on prévient quand ce qui a été promis
 * change**. Corriger l'orthographe d'un nom, ajouter un numéro ou compléter un
 * commentaire ne déplace aucun rendez-vous et ne mérite pas un message
 * « votre rendez-vous a été déplacé ».
 */

export type AdminAppointmentChange = 'created' | 'rescheduled' | 'unchanged'

interface AppointmentShape {
  startsAt: Date
  serviceId: string
}

export const describeAdminAppointmentChange = (
  previous: AppointmentShape | null,
  next: AppointmentShape,
): AdminAppointmentChange => {
  if (!previous) return 'created'
  const movedInTime = previous.startsAt.getTime() !== next.startsAt.getTime()
  const changedService = previous.serviceId !== next.serviceId
  return movedInTime || changedService ? 'rescheduled' : 'unchanged'
}

/**
 * La phrase qui suit « Le rendez-vous a été mis à jour ».
 *
 * Elle dit toujours quelque chose : ne rien dire laisserait croire qu'un
 * message est parti alors qu'aucune adresse n'était enregistrée.
 */
export const describeAdminNotification = (
  recipient: string | null,
  expected: boolean,
): string => {
  if (!expected) return ''
  if (recipient) return ` ${recipient} a été prévenu par e-mail.`
  return ' Personne n’a été prévenu : ce rendez-vous n’a pas d’adresse e-mail.'
}
