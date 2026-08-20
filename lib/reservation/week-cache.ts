import type { DayAvailability } from '@/lib/reservation/availability'
import { addLocalDays } from '@/lib/reservation/time'

/**
 * La comptabilité du calendrier côté client.
 *
 * Le serveur renvoie trois semaines d'un coup (voir `PUBLIC_WINDOW_LENGTH`
 * dans `lib/actions/reservation.ts`). Les deux calendriers — le tunnel de
 * réservation et le déplacement depuis « Mes rendez-vous » — accumulent ces
 * jours au lieu de ne garder que la dernière semaine chargée : revenir en
 * arrière cesse alors d'être un aller-retour réseau.
 *
 * Fonctions pures, sans état ni React : les deux calendriers ont des effets de
 * bord très différents et gardent leur propre effet, mais ils ne doivent pas
 * tenir deux comptabilités différentes de ce qui est chargé.
 */

const WEEK_LENGTH = 7

/** Les sept jours d'une semaine affichée, du premier au dernier. */
export const weekDateKeys = (viewStart: string): string[] =>
  Array.from({ length: WEEK_LENGTH }, (_, index) =>
    addLocalDays(viewStart, index),
  )

/**
 * La semaine affichée est-elle entièrement connue ?
 *
 * Sept jours présents, pas un de moins : afficher six jours et une case vide
 * serait pire que d'attendre.
 */
export const hasCompleteWeek = (
  availability: Record<string, DayAvailability>,
  viewStart: string,
): boolean => weekDateKeys(viewStart).every(dateKey => dateKey in availability)

/**
 * Fusionne une fenêtre fraîchement chargée dans ce qui était déjà connu.
 *
 * Les jours rechargés écrasent les anciens : une réponse plus récente dit
 * toujours mieux qu'une plus ancienne quel créneau est encore libre.
 */
export const mergeAvailability = (
  previous: Record<string, DayAvailability>,
  loaded: Record<string, DayAvailability>,
): Record<string, DayAvailability> => ({ ...previous, ...loaded })
