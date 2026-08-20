/**
 * Le lien « Déplacer ou annuler » des e-mails.
 *
 * Quelqu'un qui clique dans un message envoyé à son adresse a déjà prouvé qu'il
 * lit cette boîte : lui redemander l'adresse est une étape pour rien. Le lien
 * porte donc l'adresse, et la route de connexion ouvre la session puis
 * **redirige vers `/mes-rendez-vous` sans le paramètre** — l'adresse ne reste
 * ni dans la barre d'adresse, ni dans l'entrée d'historique où l'on revient, ni
 * dans le `Referer`, puisqu'aucune page n'est rendue avant la redirection.
 *
 * Ce que cela coûte, et qui est assumé : l'adresse traverse les journaux
 * d'accès, et un message transféré donne l'accès en un clic. Ni l'un ni l'autre
 * n'ouvre un accès nouveau — l'adresse seule suffit déjà depuis la v2, et
 * `SECURITY.md` documente ce compromis.
 *
 * Ce lien ne va **pas** dans le fichier `.ics` ni dans l'événement Google
 * Agenda : ceux-là vivent des mois dans un calendrier souvent partagé, et
 * gardent l'adresse nue de `/mes-rendez-vous`.
 */

export const MANAGE_PATH = '/mes-rendez-vous'
export const MANAGE_SIGN_IN_PATH = `${MANAGE_PATH}/connexion`
export const MANAGE_EMAIL_PARAM = 'email'

export const buildManageUrl = (
  baseUrl: string,
  email?: string | null,
): string => {
  const address = email?.trim()
  if (!address) return `${baseUrl}${MANAGE_PATH}`

  const url = new URL(`${baseUrl}${MANAGE_SIGN_IN_PATH}`)
  url.searchParams.set(MANAGE_EMAIL_PARAM, address)
  return url.toString()
}
