import prisma from '@/lib/core/prisma'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import type { Prisma } from '@/prisma/generated/prisma/client'

const activitySelect = {
  id: true,
  type: true,
  appointmentId: true,
  customerFirstNameSnapshot: true,
  customerLastNameSnapshot: true,
  serviceNameSnapshot: true,
  appointmentStartsAt: true,
  previousAppointmentStartsAt: true,
  readAt: true,
  createdAt: true,
  appointment: {
    select: {
      status: true,
      service: { select: { category: { select: { name: true } } } },
    },
  },
} satisfies Prisma.AppointmentActivitySelect

export type AppointmentActivityItem = Prisma.AppointmentActivityGetPayload<{
  select: typeof activitySelect
}>

const ACTIVITY_PAGE_SIZE = 20

export const getActivityOverview = async () => {
  const [activities, unreadCount] = await Promise.all([
    prisma.appointmentActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: activitySelect,
    }),
    prisma.appointmentActivity.count({ where: { readAt: null } }),
  ])
  return { activities, unreadCount }
}

export const getUnreadActivityCount = async (): Promise<number> =>
  prisma.appointmentActivity.count({ where: { readAt: null } })

export const getActivityPage = async (requestedPage: number) => {
  const totalCount = await prisma.appointmentActivity.count()
  const totalPages = Math.max(1, Math.ceil(totalCount / ACTIVITY_PAGE_SIZE))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  const [activities, unreadCount] = await Promise.all([
    prisma.appointmentActivity.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * ACTIVITY_PAGE_SIZE,
      take: ACTIVITY_PAGE_SIZE,
      select: activitySelect,
    }),
    prisma.appointmentActivity.count({ where: { readAt: null } }),
  ])
  return { activities, unreadCount, page, totalPages, totalCount }
}

const formatAppointmentMoment = (date: Date): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: RESERVATION_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

export const formatActivityCreatedAt = (date: Date): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: RESERVATION_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)

export const formatActivityMessage = (
  activity: Pick<
    AppointmentActivityItem,
    | 'type'
    | 'customerFirstNameSnapshot'
    | 'customerLastNameSnapshot'
    | 'serviceNameSnapshot'
    | 'appointmentStartsAt'
    | 'previousAppointmentStartsAt'
    | 'appointment'
  >,
): string => {
  const customerName = [
    activity.customerFirstNameSnapshot,
    activity.customerLastNameSnapshot,
  ]
    .filter(Boolean)
    .join(' ')
  const appointmentMoment = formatAppointmentMoment(
    activity.appointmentStartsAt,
  )
  const serviceLabel = formatServiceLabel(
    activity.serviceNameSnapshot,
    activity.appointment?.service.category?.name,
  )

  if (activity.type === 'RESCHEDULED' && activity.previousAppointmentStartsAt)
    return `${customerName} a déplacé ${serviceLabel} du ${formatAppointmentMoment(activity.previousAppointmentStartsAt)} au ${appointmentMoment}.`

  if (activity.type === 'CANCELLED')
    return `${customerName} a annulé ${serviceLabel}, prévu le ${appointmentMoment}.`

  return `${customerName} a réservé ${serviceLabel} pour le ${appointmentMoment}.`
}
