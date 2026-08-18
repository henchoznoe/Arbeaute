/**
 * Mises en forme partagées par le site public, l'administration et les e-mails.
 *
 * Elles existent pour qu'une même donnée ne s'écrive pas de deux façons selon
 * l'écran : un prix affiché « 30 CHF » ici et « 30.00 CHF » là suffit à faire
 * douter quelqu'un qui n'a pas les repères pour distinguer une coquille d'une
 * vraie erreur.
 */

/**
 * Met une majuscule à la première lettre, et à elle seule.
 *
 * Remplace la classe CSS `capitalize`, qui met une majuscule à *chaque* mot :
 * appliquée à une phrase elle produisait « Créneau À Choisir », et appliquée à
 * une date « Lundi, 17 Août 2026 ».
 */
export const capitalizeFirst = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1)

/**
 * « 30 CHF », « 1'250 CHF », « 75.50 CHF ».
 *
 * Le formateur monétaire `fr-CH` sépare les décimales par un point, là où le
 * formateur numérique met une virgule : un prix de 75.50 s'affichait « 75,5 CHF »,
 * qui n'est ni une somme suisse ni même un prix. Les francs entiers restent
 * sans décimale, les autres en portent exactement deux.
 */
const wholeFrancs = new Intl.NumberFormat('fr-CH', {
  style: 'currency',
  currency: 'CHF',
  minimumFractionDigits: 0,
})

const withCentimes = new Intl.NumberFormat('fr-CH', {
  style: 'currency',
  currency: 'CHF',
  minimumFractionDigits: 2,
})

export const formatPrice = (priceCents: number): string =>
  (priceCents % 100 === 0 ? wholeFrancs : withCentimes).format(priceCents / 100)

/**
 * « 3 » ,« 3 000 » — un décompte, jamais une somme.
 *
 * Existe pour que les écrans n'aient aucune raison d'appeler `toLocaleString`
 * eux-mêmes : c'est cet appel-là qui avait fini par mettre en forme des prix
 * avec le formateur numérique, et donc à écrire « 75,5 CHF ».
 */
const counts = new Intl.NumberFormat('fr-CH')

export const formatCount = (value: number): string => counts.format(value)
