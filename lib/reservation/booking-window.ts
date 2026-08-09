import { cacheLife } from 'next/cache'
import { getBookingDateLimits } from '@/lib/reservation/time'

export interface BookingWindow {
  min: string
  max: string
}

/**
 * Bornes du sélecteur de date, mises en cache pour que la page de réservation
 * reste prérendue. Elles ne servent qu'à cadrer le calendrier : les créneaux,
 * eux, sont toujours calculés à la requête avec l'heure réelle, donc une borne
 * d'une heure de retard après minuit reste sans effet sur ce qui est
 * réservable.
 */
export const getPublicBookingWindow = async (): Promise<BookingWindow> => {
  'use cache'
  cacheLife('hours')

  const { min, max } = getBookingDateLimits()
  return { min, max }
}
