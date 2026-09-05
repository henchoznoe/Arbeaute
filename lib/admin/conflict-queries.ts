import {
  findAppointmentConflicts,
  groupAppointmentConflicts,
} from '@/lib/admin/conflicts'
import prisma from '@/lib/core/prisma'

export const getUpcomingConflicts = async (now = new Date()) => {
  // Une seule lecture des intervalles, sans horizon arbitraire ni coordonnées.
  const intervals = await prisma.appointment.findMany({
    where: { status: 'CONFIRMED', occupiedEndsAt: { gt: now } },
    orderBy: [{ occupiedStartsAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      occupiedStartsAt: true,
      occupiedEndsAt: true,
      status: true,
    },
  })
  const conflicts = findAppointmentConflicts(intervals, now)
  const ids = [...new Set(conflicts.flatMap(c => [c.firstId, c.secondId]))]
  return { conflicts, ids, groups: groupAppointmentConflicts(conflicts) }
}

export const getConflictAppointments = async (ids: string[]) =>
  ids.length
    ? prisma.appointment.findMany({
        where: { id: { in: ids } },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          customerFirstName: true,
          customerLastName: true,
          customerPhone: true,
          serviceNameSnapshot: true,
        },
      })
    : []
