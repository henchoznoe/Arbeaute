/**
 * Phrases d’exemple des règles de réservation.
 *
 * Chaque réglage est expliqué par ce qu’il produit concrètement, avec la valeur
 * réellement enregistrée : « 12 heures » ne dit rien à Arzu, « quelqu'un qui
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
    return 'Aucun délai : un créneau qui commence dans quelques minutes peut encore être réservé.'
  if (hours < 24)
    return `Avec ${plural(hours, 'heure')}, quelqu’un qui regarde le site à 8 h du matin ne peut rien prendre avant ${8 + hours} h le jour même.`

  const days = Math.round(hours / 24)
  return `Avec ${plural(hours, 'heure')}, soit environ ${plural(days, 'jour')}, les créneaux des ${plural(days, 'prochain jour', 'prochains jours')} ne sont plus réservables en ligne.`
}

export const describeBookingHorizon = (months: number): string =>
  `Le calendrier s’arrête après ${plural(months, 'mois', 'mois')}. Au-delà, plus aucune date ne s’affiche et il faut vous appeler.`

export const describeChangeCutoff = (hours: number): string => {
  if (hours === 0)
    return 'Aucun verrou : un rendez-vous peut être déplacé ou annulé jusqu’à la dernière minute.'
  return `Un rendez-vous ne peut plus être déplacé ni annulé sans vous dans les ${plural(hours, 'dernière heure', 'dernières heures')} qui le précèdent. Le week-end ne compte pas dans ce décompte, il repousse donc le verrou d’autant.`
}

export const describeSlotInterval = (minutes: number): string => {
  const first = 9 * 60
  const times = [0, 1, 2]
    .map(step => {
      const total = first + step * minutes
      return `${Math.floor(total / 60)} h ${(total % 60).toString().padStart(2, '0')}`
    })
    .join(', ')
  return `Les heures proposées seront ${times}, et ainsi de suite.`
}

export const formatSlotIntervalLabel = (minutes: number): string =>
  minutes === 60 ? 'Toutes les heures' : `Toutes les ${minutes} minutes`

export const describeLateRequests = (
  enabled: boolean,
  noticeHours: number,
  floorHours: number,
): string => {
  if (!enabled)
    return 'Désactivé : une journée dont toutes les heures sont trop proches s’affiche comme complète, sans distinction avec une journée réellement pleine.'
  // Un plancher qui rattrape le délai de réservation ne laisse aucune heure
  // entre les deux : le dire vaut mieux qu'un réglage sans effet visible.
  if (floorHours >= noticeHours)
    return `Aucune heure ne sera proposée sur demande : le délai minimum d’une demande (${plural(floorHours, 'heure')}) rattrape déjà celui de la réservation en ligne (${plural(noticeHours, 'heure')}). Réduisez le premier pour ouvrir une marge.`

  return `Les heures encore libres entre ${plural(floorHours, 'heure')} et ${plural(noticeHours, 'heure')} avant le soin restent affichées, marquées « sur demande ». Elles ne se réservent pas en ligne : vous recevez la demande et vous décidez.`
}

export const describeLateRequestFloor = (hours: number): string => {
  if (hours === 0)
    return 'Aucun plancher : une demande peut vous arriver pour une heure qui commence dans quelques minutes.'
  return `Rien n’est proposé, même sur demande, dans les ${plural(hours, 'dernière heure', 'dernières heures')} qui précèdent une heure libre. De quoi vous laisser le temps de voir passer le message.`
}
