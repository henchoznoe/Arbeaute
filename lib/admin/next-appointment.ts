/**
 * Délai restant avant un rendez-vous, écrit en français courant.
 *
 * Arzu lit l'agenda entre deux soins : « dans 25 minutes » se comprend d'un
 * coup d'œil, un horaire seul demande une soustraction mentale. Les seuils
 * sont volontairement grossiers — la minute près n'apporte rien.
 */
export const formatAppointmentCountdown = (
  startsAt: Date,
  now: Date,
): string => {
  const minutes = Math.round((startsAt.getTime() - now.getTime()) / 60_000)
  if (minutes < 0) return 'En cours'
  if (minutes === 0) return 'Maintenant'
  if (minutes < 60) return `Dans ${minutes} minute${minutes > 1 ? 's' : ''}`

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours < 24)
    return remaining
      ? `Dans ${hours} h ${remaining.toString().padStart(2, '0')}`
      : `Dans ${hours} h`

  const days = Math.round(hours / 24)
  return `Dans ${days} jour${days > 1 ? 's' : ''}`
}
