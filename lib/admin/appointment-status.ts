import { writeAuditEvent } from '@/lib/admin/audit'
import { MAX_SERIALIZABLE_ATTEMPTS } from '@/lib/reservation/constants'
import { Prisma, type PrismaClient } from '@/prisma/generated/prisma/client'
import type { AppointmentStatus } from '@/prisma/generated/prisma/enums'

/**
 * `COMPLETED` n'est plus jamais écrit : un rendez-vous confirmé dont l'heure est
 * passée compte comme réalisé, personne n'a à le marquer à la main. Le statut
 * reste lu partout — badges, exports, historique — pour les rendez-vous que
 * l'ancienne interface avait déjà marqués.
 */
export type AdminAppointmentStatusTarget = Extract<
  AppointmentStatus,
  'CONFIRMED' | 'NO_SHOW'
>

export class AdminAppointmentStatusError extends Error {
  constructor(
    public readonly code:
      | 'APPOINTMENT_NOT_FOUND'
      | 'INVALID_TRANSITION'
      | 'OVERLAP',
  ) {
    super(code)
  }
}

const shouldRetry = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2034'

const isOverlapConstraint = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes('appointment_no_confirmed_overlap') ||
    error.message.includes('Exclusion constraint'))

const isAllowedTransition = (
  current: AppointmentStatus,
  target: AdminAppointmentStatusTarget,
): boolean =>
  target === 'CONFIRMED' ? current !== 'CONFIRMED' : current === 'CONFIRMED'

export const changeAdminAppointmentStatusSerializable = async (
  database: PrismaClient,
  appointmentId: string,
  targetStatus: AdminAppointmentStatusTarget,
) => {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await database.$transaction(
        async transaction => {
          const current = await transaction.appointment.findUnique({
            where: { id: appointmentId },
            select: {
              id: true,
              status: true,
              customerId: true,
              serviceNameSnapshot: true,
              occupiedStartsAt: true,
              occupiedEndsAt: true,
              allowsOverlap: true,
            },
          })
          if (!current)
            throw new AdminAppointmentStatusError('APPOINTMENT_NOT_FOUND')
          if (!isAllowedTransition(current.status, targetStatus))
            throw new AdminAppointmentStatusError('INVALID_TRANSITION')

          // Un rendez-vous qu'Arzu a volontairement superposé garde son droit :
          // sans cette exception, le noter absent puis le rétablir le bloquerait
          // définitivement.
          if (targetStatus === 'CONFIRMED' && !current.allowsOverlap) {
            const conflict = await transaction.appointment.findFirst({
              where: {
                id: { not: current.id },
                status: 'CONFIRMED',
                occupiedStartsAt: { lt: current.occupiedEndsAt },
                occupiedEndsAt: { gt: current.occupiedStartsAt },
              },
              select: { id: true },
            })
            if (conflict) throw new AdminAppointmentStatusError('OVERLAP')
          }

          const updated = await transaction.appointment.update({
            where: { id: current.id },
            data: {
              status: targetStatus,
              ...(targetStatus === 'CONFIRMED' ? { cancelledAt: null } : {}),
            },
            select: {
              id: true,
              status: true,
              customerId: true,
              serviceNameSnapshot: true,
            },
          })
          await writeAuditEvent(transaction, {
            actorType: 'ADMIN',
            actorId: 'admin',
            entityType: 'APPOINTMENT',
            entityId: updated.id,
            entityLabel: updated.serviceNameSnapshot,
            action: targetStatus === 'CONFIRMED' ? 'RESTORED' : 'UPDATED',
            before: { status: current.status },
            after: { status: updated.status },
          })
          return updated
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (error) {
      if (error instanceof AdminAppointmentStatusError) throw error
      if (isOverlapConstraint(error))
        throw new AdminAppointmentStatusError('OVERLAP')
      if (!shouldRetry(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS)
        throw error
    }
  }
  throw new AdminAppointmentStatusError('OVERLAP')
}
