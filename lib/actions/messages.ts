/**
 * Les refus que toutes les actions partagent.
 *
 * La même situation recevait trois réponses différentes : « Reconnectez-vous,
 * puis recommencez » côté administration, « Reconnectez-vous » côté site, et
 * « Indiquez à nouveau votre adresse » pour le retrait d'une demande. Les deux
 * premières demandaient de *se reconnecter* à des personnes qui n'ont aucun mot
 * de passe : côté public, la seule chose à faire est de ressaisir son adresse.
 *
 * Les refus d'origine, eux, ne disaient rien à faire — « La demande est
 * invalide. », « Action impossible depuis cette page. » C'est exactement ce que
 * `docs/vocabulaire.md` proscrit : dire ce qui s'est passé, puis nommer le
 * geste.
 */

/** Une phrase d'expiration par audience, chacune nommant un geste qui existe. */
export const ADMIN_SESSION_EXPIRED =
  'Votre session a expiré. Reconnectez-vous, puis recommencez.'

export const CUSTOMER_SESSION_EXPIRED =
  'Votre session a expiré. Indiquez à nouveau votre adresse e-mail, puis recommencez.'

/**
 * Un refus d'origine se produit quand l'action ne part pas de la page qui
 * l'affiche : un onglet resté ouvert trop longtemps, le plus souvent. La
 * plupart des actions d'administration vérifient la session et l'origine d'un
 * même geste et répondent alors par la phrase d'expiration ; celles qui
 * distinguent les deux emploient celle-ci.
 */
export const ADMIN_WRONG_ORIGIN =
  'Cette action n’est pas partie de l’écran attendu. Rechargez la page, puis recommencez.'

export const CUSTOMER_WRONG_ORIGIN =
  'Cette action n’est pas partie de l’écran attendu. Rechargez « Mes rendez-vous », puis recommencez.'

/**
 * Le développeur a un nom, et un seul : « prévenez le développeur » était
 * arrivé avec la phase 2 des demandes, à côté de « prévenez Noé ».
 */
export const DEVELOPER_NAME = 'Noé'
