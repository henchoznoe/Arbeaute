import { writeAuditEvent } from '@/lib/admin/audit'
import { MAX_SERIALIZABLE_ATTEMPTS } from '@/lib/reservation/constants'
import { Prisma, type PrismaClient } from '@/prisma/generated/prisma/client'
import type { AvailabilityExceptionType } from '@/prisma/generated/prisma/enums'

interface AvailabilityExceptionRow {
  type: AvailabilityExceptionType
  startsAt: Date
  endsAt: Date
  label: string | null
}

interface CreateAvailabilityExceptionGroupInput {
  groupId: string
  rows: AvailabilityExceptionRow[]
  label: string | null
}

export class AdminAvailabilityExceptionError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'OVERLAP') {
    super(code)
  }
}

const shouldRetry = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2034'

export const createAvailabilityExceptionGroupSerializable = async (
  database: PrismaClient,
  input: CreateAvailabilityExceptionGroupInput,
): Promise<number> => {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await database.$transaction(
        async transaction => {
          const overlap = await transaction.availabilityException.findFirst({
            where: {
              OR: input.rows.map(row => ({
                startsAt: { lt: row.endsAt },
                endsAt: { gt: row.startsAt },
              })),
            },
            select: { id: true },
          })
          if (overlap) throw new AdminAvailabilityExceptionError('OVERLAP')

          const created =
            await transaction.availabilityException.createManyAndReturn({
              data: input.rows.map(row => ({
                ...row,
                groupId: input.groupId,
              })),
              select: { id: true },
            })
          const first = created[0]
          if (!first) return 0
          await writeAuditEvent(transaction, {
            actorType: 'ADMIN',
            actorId: 'admin',
            entityType: 'AVAILABILITY_EXCEPTION',
            entityId: first.id,
            entityLabel: input.label || `${input.rows.length} plage(s)`,
            action: 'CREATED',
            after: {
              type: input.rows[0]?.type ?? 'UNAVAILABLE',
              from: input.rows[0]?.startsAt.toISOString() ?? null,
              to: input.rows.at(-1)?.endsAt.toISOString() ?? null,
              count: input.rows.length,
            },
          })
          return created.length
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (error) {
      if (!shouldRetry(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS)
        throw error
    }
  }
  throw new Error('Unreachable')
}

export const deleteAvailabilityExceptionGroupAudited = async (
  database: PrismaClient,
  groupId: string,
): Promise<number> =>
  database.$transaction(async transaction => {
    const rows = await transaction.availabilityException.findMany({
      where: { groupId },
      orderBy: { startsAt: 'asc' },
    })
    const first = rows[0]
    if (!first) throw new AdminAvailabilityExceptionError('NOT_FOUND')
    const deleted = await transaction.availabilityException.deleteMany({
      where: { groupId },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'AVAILABILITY_EXCEPTION',
      entityId: first.id,
      entityLabel: first.label,
      action: 'DELETED',
      before: {
        type: first.type,
        from: first.startsAt.toISOString(),
        to: rows.at(-1)?.endsAt.toISOString() ?? null,
        count: deleted.count,
      },
    })
    return deleted.count
  })
