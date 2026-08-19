import { writeAuditEvent } from '@/lib/admin/audit'
import prisma from '@/lib/core/prisma'
import { getAvailableSlots } from '@/lib/reservation/availability'
import { getBookingSettings } from '@/lib/reservation/booking-settings'
import { MAX_SERIALIZABLE_ATTEMPTS } from '@/lib/reservation/constants'
import {
  normalizeCustomerSearchName,
  upsertCustomerIdentity,
} from '@/lib/reservation/customers'
import { getLocalDateKey } from '@/lib/reservation/time'
import { Prisma, type PrismaClient } from '@/prisma/generated/prisma/client'

/**
 * Une demande n'est pas un rendez-vous.
 *
 * Elle vit dans sa propre table pour que rien — agenda, bilan hebdomadaire,
 * exports, indicateurs — n'ait à la filtrer pour ne pas la compter, et elle
 * reste hors de la contrainte d'exclusion : deux personnes peuvent demander la
 * même heure. C'est l'acceptation qui tranche, et la contrainte protège
 * l'écriture du rendez-vous à ce moment-là.
 */
export class LateRequestError extends Error {
  constructor(
    public readonly code:
      | 'SLOT_NOT_ON_REQUEST'
      | 'REQUESTS_DISABLED'
      | 'TOO_MANY_PENDING'
      | 'REQUEST_NOT_FOUND'
      | 'ALREADY_DECIDED'
      | 'OVERLAP',
  ) {
    super(code)
  }
}

/** Au-delà, la personne encombre l'attention d'Arzu plutôt qu'elle ne réserve. */
const MAX_PENDING_REQUESTS_PER_CUSTOMER = 2

interface LateRequestInput {
  serviceId: string
  requestedStartsAt: Date
  firstName: string | null
  lastName: string
  email: string
  phone: string
  comment: string | null
}

const shouldRetry = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2034'

const isOverlapConstraint = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes('appointment_no_confirmed_overlap') ||
    error.message.includes('Exclusion constraint'))

const requestSelect = {
  id: true,
  serviceId: true,
  customerId: true,
  requestedStartsAt: true,
  serviceNameSnapshot: true,
  servicePriceCents: true,
  serviceDurationMinutes: true,
  preparationMinutes: true,
  cleanupMinutes: true,
  comment: true,
  status: true,
  decidedAt: true,
  declineReason: true,
  appointmentId: true,
  createdAt: true,
} satisfies Prisma.AppointmentRequestSelect

export type LateRequest = Prisma.AppointmentRequestGetPayload<{
  select: typeof requestSelect
}>

/**
 * Enregistre une demande après avoir revérifié, à l'instant de l'écriture, que
 * l'heure est bien de celles qui ne se réservent pas en ligne. Une heure
 * ordinaire doit passer par la réservation normale : accepter les deux ici
 * ouvrirait un second chemin d'écriture sans les garanties du premier.
 */
export const createLateRequestSerializable = async (
  database: PrismaClient,
  input: LateRequestInput,
) => {
  const settings = await getBookingSettings()
  if (!settings.lateRequestsEnabled)
    throw new LateRequestError('REQUESTS_DISABLED')

  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await database.$transaction(
        async transaction => {
          const service = await transaction.service.findFirst({
            where: {
              id: input.serviceId,
              isBookable: true,
              isVisible: true,
              isArchived: false,
            },
          })
          if (!service) throw new LateRequestError('SLOT_NOT_ON_REQUEST')

          const slots = await getAvailableSlots({
            database: transaction,
            serviceId: service.id,
            dateKey: getLocalDateKey(input.requestedStartsAt),
            settings,
          })
          if (
            !slots.some(
              slot =>
                slot.startsAt === input.requestedStartsAt.toISOString() &&
                slot.state === 'ON_REQUEST',
            )
          )
            throw new LateRequestError('SLOT_NOT_ON_REQUEST')

          const customer = await upsertCustomerIdentity(transaction, {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
          })

          const pending = await transaction.appointmentRequest.count({
            where: { customerId: customer.id, status: 'PENDING' },
          })
          if (pending >= MAX_PENDING_REQUESTS_PER_CUSTOMER)
            throw new LateRequestError('TOO_MANY_PENDING')

          const request = await transaction.appointmentRequest.create({
            data: {
              serviceId: service.id,
              customerId: customer.id,
              requestedStartsAt: input.requestedStartsAt,
              serviceNameSnapshot: service.name,
              servicePriceCents: service.priceCents,
              serviceDurationMinutes: service.durationMinutes,
              preparationMinutes: service.preparationMinutes,
              cleanupMinutes: service.cleanupMinutes,
              comment: input.comment,
            },
            select: requestSelect,
          })
          await writeAuditEvent(transaction, {
            actorType: 'CUSTOMER',
            actorId: customer.id,
            entityType: 'APPOINTMENT_REQUEST',
            entityId: request.id,
            entityLabel: request.serviceNameSnapshot,
            action: 'CREATED',
            after: {
              serviceId: request.serviceId,
              requestedStartsAt: request.requestedStartsAt.toISOString(),
              status: request.status,
            },
          })
          return { request, customer }
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (error) {
      if (error instanceof LateRequestError) throw error
      if (!shouldRetry(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS)
        throw error
    }
  }
  throw new LateRequestError('SLOT_NOT_ON_REQUEST')
}

/**
 * Accepte la demande et crée le rendez-vous qu'elle appelait.
 *
 * Le délai de réservation ne s'applique plus : c'est justement ce qu'Arzu vient
 * d'accorder. La contrainte d'exclusion reste le dernier garde-fou — si l'heure
 * a été prise entre-temps, l'écriture échoue et la demande reste en attente.
 */
export const acceptLateRequestSerializable = async (
  database: PrismaClient,
  requestId: string,
) => {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await database.$transaction(
        async transaction => {
          const request = await transaction.appointmentRequest.findUnique({
            where: { id: requestId },
            select: {
              ...requestSelect,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          })
          if (!request) throw new LateRequestError('REQUEST_NOT_FOUND')
          // Une seconde acceptation ne doit pas créer un second rendez-vous.
          if (request.status !== 'PENDING')
            throw new LateRequestError('ALREADY_DECIDED')

          const { customer } = request
          const endsAt = new Date(
            request.requestedStartsAt.getTime() +
              request.serviceDurationMinutes * 60_000,
          )
          const appointment = await transaction.appointment.create({
            data: {
              serviceId: request.serviceId,
              customerId: customer.id,
              serviceNameSnapshot: request.serviceNameSnapshot,
              servicePriceCents: request.servicePriceCents,
              serviceDurationMinutes: request.serviceDurationMinutes,
              preparationMinutes: request.preparationMinutes,
              cleanupMinutes: request.cleanupMinutes,
              startsAt: request.requestedStartsAt,
              endsAt,
              occupiedStartsAt: new Date(
                request.requestedStartsAt.getTime() -
                  request.preparationMinutes * 60_000,
              ),
              occupiedEndsAt: new Date(
                endsAt.getTime() + request.cleanupMinutes * 60_000,
              ),
              customerFirstName: customer.firstName,
              customerLastName: customer.lastName,
              customerSearchName: normalizeCustomerSearchName(
                customer.firstName,
                customer.lastName,
              ),
              customerEmail: customer.email,
              customerPhone: customer.phone,
              comment: request.comment,
              source: 'PUBLIC',
              status: 'CONFIRMED',
            },
          })
          await transaction.appointmentActivity.create({
            data: {
              type: 'CREATED',
              appointmentId: appointment.id,
              customerFirstNameSnapshot: appointment.customerFirstName,
              customerLastNameSnapshot: appointment.customerLastName,
              serviceNameSnapshot: appointment.serviceNameSnapshot,
              appointmentStartsAt: appointment.startsAt,
            },
          })
          const updated = await transaction.appointmentRequest.update({
            where: { id: request.id },
            data: {
              status: 'ACCEPTED',
              decidedAt: new Date(),
              appointmentId: appointment.id,
            },
            select: requestSelect,
          })
          await writeAuditEvent(transaction, {
            actorType: 'ADMIN',
            actorId: 'admin',
            entityType: 'APPOINTMENT_REQUEST',
            entityId: request.id,
            entityLabel: request.serviceNameSnapshot,
            action: 'ACCEPTED',
            before: { status: request.status },
            after: {
              status: updated.status,
              requestedStartsAt: request.requestedStartsAt.toISOString(),
            },
          })
          return { request: updated, appointment }
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (error) {
      if (error instanceof LateRequestError) throw error
      if (isOverlapConstraint(error)) throw new LateRequestError('OVERLAP')
      if (!shouldRetry(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS)
        throw error
    }
  }
  throw new LateRequestError('OVERLAP')
}

/** Refus ou retrait : une seule écriture, pas de rendez-vous, pas de créneau. */
const closeRequest = async (
  database: PrismaClient,
  requestId: string,
  outcome: 'DECLINED' | 'WITHDRAWN',
  options: { declineReason?: string | null; customerId?: string } = {},
) =>
  database.$transaction(async transaction => {
    const request = await transaction.appointmentRequest.findUnique({
      where: { id: requestId },
      select: requestSelect,
    })
    if (
      !request ||
      (options.customerId && request.customerId !== options.customerId)
    )
      throw new LateRequestError('REQUEST_NOT_FOUND')
    if (request.status !== 'PENDING')
      throw new LateRequestError('ALREADY_DECIDED')

    const updated = await transaction.appointmentRequest.update({
      where: { id: request.id },
      data: {
        status: outcome,
        decidedAt: new Date(),
        declineReason: options.declineReason ?? null,
      },
      select: requestSelect,
    })
    await writeAuditEvent(transaction, {
      actorType: outcome === 'DECLINED' ? 'ADMIN' : 'CUSTOMER',
      actorId: outcome === 'DECLINED' ? 'admin' : request.customerId,
      entityType: 'APPOINTMENT_REQUEST',
      entityId: request.id,
      entityLabel: request.serviceNameSnapshot,
      action: outcome === 'DECLINED' ? 'DECLINED' : 'CANCELLED',
      before: { status: request.status },
      after: {
        status: updated.status,
        declineReason: updated.declineReason,
      },
    })
    return updated
  })

export const declineLateRequestSerializable = (
  database: PrismaClient,
  requestId: string,
  declineReason: string | null,
) => closeRequest(database, requestId, 'DECLINED', { declineReason })

export const withdrawLateRequestSerializable = (
  database: PrismaClient,
  requestId: string,
  customerId: string,
) => closeRequest(database, requestId, 'WITHDRAWN', { customerId })

/**
 * Une demande dont l'heure est passée sans réponse est périmée d'elle-même.
 *
 * Rien ne la balaie : l'état se déduit à la lecture. Le plan gratuit de Vercel
 * n'autorise qu'un cron, déjà pris par le bilan du dimanche, et une tâche de
 * fond pour un cas qui se lit en une comparaison serait du travail pour rien.
 */
export const isLateRequestExpired = (
  request: Pick<LateRequest, 'status' | 'requestedStartsAt'>,
  now: Date = new Date(),
): boolean => request.status === 'PENDING' && request.requestedStartsAt <= now

export const getPendingLateRequestCount = (
  now: Date = new Date(),
): Promise<number> =>
  prisma.appointmentRequest.count({
    where: { status: 'PENDING', requestedStartsAt: { gt: now } },
  })

export const getLateRequestsForAdmin = (limit = 50) =>
  prisma.appointmentRequest.findMany({
    orderBy: [{ status: 'asc' }, { requestedStartsAt: 'asc' }],
    take: limit,
    select: {
      ...requestSelect,
      customer: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
    },
  })

export type AdminLateRequest = Awaited<
  ReturnType<typeof getLateRequestsForAdmin>
>[number]

export const getPendingLateRequestsForCustomer = (
  customerId: string,
): Promise<LateRequest[]> =>
  prisma.appointmentRequest.findMany({
    where: { customerId, status: 'PENDING' },
    orderBy: { requestedStartsAt: 'asc' },
    select: requestSelect,
  })
