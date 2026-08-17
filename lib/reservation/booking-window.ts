import { cacheLife, cacheTag } from 'next/cache'
import {
  BOOKING_SETTINGS_TAG,
  formatCustomerChangeCutoff,
  getBookingSettings,
} from '@/lib/reservation/booking-settings'
import { getBookingDateLimits } from '@/lib/reservation/time'

export interface BookingWindow {
  min: string
  max: string
  customerChangeCutoffLabel: string
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
  cacheTag(BOOKING_SETTINGS_TAG)

  const settings = await getBookingSettings()
  const { min, max } = getBookingDateLimits(
    new Date(),
    settings.bookingHorizonMonths,
  )
  return {
    min,
    max,
    customerChangeCutoffLabel: formatCustomerChangeCutoff(
      settings.customerChangeCutoffHours,
    ),
  }
}
