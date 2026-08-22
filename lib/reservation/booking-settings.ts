import { cacheLife, cacheTag } from 'next/cache'
import prisma from '@/lib/core/prisma'
import {
  DEFAULT_BOOKING_HORIZON_MONTHS,
  DEFAULT_LATE_REQUEST_FLOOR_HOURS,
  DEFAULT_LATE_REQUESTS_ENABLED,
  DEFAULT_MIN_BOOKING_NOTICE_HOURS,
  DEFAULT_SLOT_INTERVAL_MINUTES,
} from '@/lib/reservation/constants'

export const BOOKING_SETTINGS_ID = 'default'
export const BOOKING_SETTINGS_TAG = 'booking-settings'

export interface BookingSettingsValues {
  minBookingNoticeHours: number
  bookingHorizonMonths: number
  slotIntervalMinutes: number
  lateRequestsEnabled: boolean
  lateRequestFloorHours: number
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettingsValues = {
  minBookingNoticeHours: DEFAULT_MIN_BOOKING_NOTICE_HOURS,
  bookingHorizonMonths: DEFAULT_BOOKING_HORIZON_MONTHS,
  slotIntervalMinutes: DEFAULT_SLOT_INTERVAL_MINUTES,
  lateRequestsEnabled: DEFAULT_LATE_REQUESTS_ENABLED,
  lateRequestFloorHours: DEFAULT_LATE_REQUEST_FLOOR_HOURS,
}

/** « 12 heures », « 2 jours » — le préavis, lisible dans une phrase. */
export const formatBookingNotice = (hours: number): string => {
  if (hours < 24) return `${hours} heure${hours > 1 ? 's' : ''}`
  const days = Math.round(hours / 24)
  return `${days} jour${days > 1 ? 's' : ''}`
}

/** « 3 mois » — jusqu'à quand le calendrier va. */
export const formatBookingHorizon = (months: number): string => `${months} mois`

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
      slotIntervalMinutes: true,
      lateRequestsEnabled: true,
      lateRequestFloorHours: true,
    },
  })
  return settings ?? DEFAULT_BOOKING_SETTINGS
}
