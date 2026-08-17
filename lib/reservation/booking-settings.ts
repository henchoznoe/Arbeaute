import { cacheLife, cacheTag } from 'next/cache'
import prisma from '@/lib/core/prisma'
import {
  DEFAULT_BOOKING_HORIZON_MONTHS,
  DEFAULT_CUSTOMER_CHANGE_CUTOFF_HOURS,
  DEFAULT_MIN_BOOKING_NOTICE_HOURS,
  DEFAULT_SLOT_INTERVAL_MINUTES,
} from '@/lib/reservation/constants'

export const BOOKING_SETTINGS_ID = 'default'
export const BOOKING_SETTINGS_TAG = 'booking-settings'

export interface BookingSettingsValues {
  minBookingNoticeHours: number
  bookingHorizonMonths: number
  customerChangeCutoffHours: number
  slotIntervalMinutes: number
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettingsValues = {
  minBookingNoticeHours: DEFAULT_MIN_BOOKING_NOTICE_HOURS,
  bookingHorizonMonths: DEFAULT_BOOKING_HORIZON_MONTHS,
  customerChangeCutoffHours: DEFAULT_CUSTOMER_CHANGE_CUTOFF_HOURS,
  slotIntervalMinutes: DEFAULT_SLOT_INTERVAL_MINUTES,
}

export const formatCustomerChangeCutoff = (hours: number): string =>
  `${hours} heure${hours > 1 ? 's' : ''} ouvrable${hours > 1 ? 's' : ''}`

/** Source unique mise en cache pour les règles de réservation publiques. */
export const getBookingSettings = async (): Promise<BookingSettingsValues> => {
  'use cache'
  cacheLife('max')
  cacheTag(BOOKING_SETTINGS_TAG)

  const settings = await prisma.bookingSettings.findUnique({
    where: { id: BOOKING_SETTINGS_ID },
    select: {
      minBookingNoticeHours: true,
      bookingHorizonMonths: true,
      customerChangeCutoffHours: true,
      slotIntervalMinutes: true,
    },
  })
  return settings ?? DEFAULT_BOOKING_SETTINGS
}
