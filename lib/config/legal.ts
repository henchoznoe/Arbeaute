/**
 * La date des trois pages légales, écrite à un seul endroit.
 *
 * Elle était recopiée dans chacune, et les trois ont divergé du produit sans
 * que la date ne bouge : une politique qui décrit une identification par e-mail
 * **et** téléphone alors que l'adresse suffit depuis la v2 est une date qui
 * ment autant que le texte. À remettre à jour quand le contenu change, pas
 * quand le fichier change.
 */
export const LEGAL_LAST_UPDATED = '20 août 2026'

/**
 * Ce que le placeholder attend : Arzu n'est pas assujettie à la TVA à ce jour,
 * mais rien dans le code ne peut le savoir. Tant que ce drapeau vaut `false`,
 * les pages disent que les prix sont nets et qu'aucune TVA n'est facturée.
 */
export const VAT_REGISTERED = false
