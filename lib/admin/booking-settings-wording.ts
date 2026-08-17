/**
 * Phrases d’exemple des règles de réservation.
 *
 * Chaque réglage est expliqué par ce qu’il produit concrètement, avec la valeur
 * réellement enregistrée : « 12 heures » ne dit rien à Arzu, « une cliente qui
 * regarde le site à 8 h ne peut rien prendre avant 20 h » se comprend tout de
 * suite. Les phrases ne prétendent jamais calculer un jour de la semaine, que
 * seul le moteur de disponibilité sait établir.
 */

const plural = (
  value: number,
  singular: string,
  pluralForm = `${singular}s`,
): string => `${value} ${value > 1 ? pluralForm : singular}`

export const describeBookingNotice = (hours: number): string => {
  if (hours === 0)
    return 'Aucun délai : une cliente peut réserver un créneau qui commence dans quelques minutes.'
  if (hours < 24)
    return `Avec ${plural(hours, 'heure')}, une cliente qui regarde le site à 8 h du matin ne peut rien prendre avant ${8 + hours} h le jour même.`

  const days = Math.round(hours / 24)
  return `Avec ${plural(hours, 'heure')}, soit environ ${plural(days, 'jour')}, les créneaux des ${plural(days, 'prochain jour', 'prochains jours')} ne sont plus réservables en ligne.`
}

export const describeBookingHorizon = (months: number): string =>
  `Le calendrier s’arrête après ${plural(months, 'mois', 'mois')}. Au-delà, une cliente ne voit plus aucune date et doit vous appeler.`

export const describeChangeCutoff = (hours: number): string => {
  if (hours === 0)
    return 'Aucun verrou : une cliente peut déplacer ou annuler jusqu’à la dernière minute.'
  return `Une cliente ne peut plus déplacer ni annuler seule dans les ${plural(hours, 'dernière heure', 'dernières heures')} avant son rendez-vous. Le week-end ne compte pas dans ce décompte, il repousse donc le verrou d’autant.`
}

export const describeSlotInterval = (minutes: number): string => {
  const first = 9 * 60
  const times = [0, 1, 2]
    .map(step => {
      const total = first + step * minutes
      return `${Math.floor(total / 60)} h ${(total % 60).toString().padStart(2, '0')}`
    })
    .join(', ')
  return `Les heures proposées aux clientes seront ${times}, et ainsi de suite.`
}

export const formatSlotIntervalLabel = (minutes: number): string =>
  minutes === 60 ? 'Toutes les heures' : `Toutes les ${minutes} minutes`
