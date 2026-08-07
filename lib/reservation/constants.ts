export const RESERVATION_TIME_ZONE = 'Europe/Zurich'
export const SLOT_INTERVAL_MINUTES = 15
export const MIN_BOOKING_NOTICE_MS = 12 * 60 * 60 * 1000
/**
 * Délai d'annulation/déplacement libre, compté en heures ouvrables
 * (samedi et dimanche exclus). Passé ce délai, la séance est due à 100 %.
 */
export const CUSTOMER_CHANGE_CUTOFF_MS = 48 * 60 * 60 * 1000
export const CUSTOMER_CHANGE_CUTOFF_LABEL = '48 heures ouvrables'
export const CUSTOMER_SESSION_MUTATION_LIMIT = 10
export const MAX_SERIALIZABLE_ATTEMPTS = 3
/** Plafond de jours pour une exception d'ouverture/fermeture sur plusieurs jours. */
export const MAX_AVAILABILITY_EXCEPTION_RANGE_DAYS = 180
