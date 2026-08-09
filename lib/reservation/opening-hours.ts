import { cacheLife, cacheTag } from 'next/cache'
import prisma from '@/lib/core/prisma'

/** Invalidé par les actions qui modifient les disponibilités hebdomadaires. */
export const OPENING_HOURS_TAG = 'opening-hours'

export interface OpeningDay {
  day: string
  ranges: { start: string; end: string }[]
}

const DAY_LABELS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
]

/** Lundi → dimanche, comme affiché au public. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const formatMinute = (minute: number): string =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(
    minute % 60,
  ).padStart(2, '0')}`

/**
 * Horaires d'ouverture réels, issus des disponibilités hebdomadaires gérées
 * dans l'administration — pour que le site public reste toujours cohérent.
 */
export const getOpeningHours = async (): Promise<OpeningDay[]> => {
  'use cache'
  cacheLife('max')
  cacheTag(OPENING_HOURS_TAG)

  const availabilities = await prisma.weeklyAvailability.findMany({
    orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
  })

  return DISPLAY_ORDER.map(dayOfWeek => ({
    day: DAY_LABELS[dayOfWeek],
    ranges: availabilities
      .filter(availability => availability.dayOfWeek === dayOfWeek)
      .map(availability => ({
        start: formatMinute(availability.startMinute),
        end: formatMinute(availability.endMinute),
      })),
  }))
}
