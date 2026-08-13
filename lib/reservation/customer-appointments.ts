import { buildServiceReservationPath } from '@/lib/reservation/deep-link'
import type { AppointmentStatus } from '@/prisma/generated/prisma/client'

export const CUSTOMER_HISTORY_LIMIT = 8

interface AppointmentStateInput {
  endsAt: Date
  startsAt: Date
  status: AppointmentStatus
}

export type CustomerAppointmentState =
  | 'UPCOMING'
  | 'IN_PROGRESS'
  | 'PAST'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'

export const getCustomerAppointmentState = (
  appointment: AppointmentStateInput,
  now = new Date(),
): CustomerAppointmentState => {
  if (appointment.status === 'CANCELLED') return 'CANCELLED'
  if (appointment.status === 'COMPLETED') return 'COMPLETED'
  if (appointment.status === 'NO_SHOW') return 'NO_SHOW'
  if (appointment.startsAt > now) return 'UPCOMING'
  if (appointment.endsAt > now) return 'IN_PROGRESS'
  return 'PAST'
}

export const customerAppointmentStateLabels = {
  UPCOMING: 'Rendez-vous confirmé',
  IN_PROGRESS: 'En cours',
  PAST: 'Rendez-vous passé',
  CANCELLED: 'Annulé',
  COMPLETED: 'Terminé',
  NO_SHOW: 'Absence',
} satisfies Record<CustomerAppointmentState, string>

interface RebookableService {
  isArchived: boolean
  isBookable: boolean
  isVisible: boolean
  slug: string
}

export const getCustomerRebookingPath = (
  service: RebookableService,
): string | null =>
  service.isBookable && service.isVisible && !service.isArchived
    ? buildServiceReservationPath(service.slug)
    : null
