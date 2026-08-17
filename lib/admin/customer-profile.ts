import { writeAuditEvent } from '@/lib/admin/audit'
import { normalizeCustomerSearchName } from '@/lib/reservation/customers'
import type { Prisma, PrismaClient } from '@/prisma/generated/prisma/client'
import { AppointmentStatus } from '@/prisma/generated/prisma/enums'

const customerSelect = {
  id: true,
  identityVersion: true,
  firstName: true,
  lastName: true,
  email: true,
  emailNormalized: true,
  phone: true,
  phoneNormalized: true,
  searchName: true,
  firstSeenAt: true,
  lastSeenAt: true,
  internalNote: true,
  preferences: true,
} satisfies Prisma.CustomerSelect

const appointmentSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  serviceNameSnapshot: true,
  servicePriceCents: true,
  status: true,
  source: true,
  service: { select: { category: { select: { name: true } } } },
} satisfies Prisma.AppointmentSelect

const duplicateSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  lastSeenAt: true,
  _count: { select: { appointments: true } },
} satisfies Prisma.CustomerSelect

export type AdminCustomer = Prisma.CustomerGetPayload<{
  select: typeof customerSelect
}>
export type AdminCustomerAppointment = Prisma.AppointmentGetPayload<{
  select: typeof appointmentSelect
}>
export type AdminCustomerDuplicate = Prisma.CustomerGetPayload<{
  select: typeof duplicateSelect
}>

export interface AdminCustomerProfile {
  customer: AdminCustomer
  upcoming: AdminCustomerAppointment[]
  history: AdminCustomerAppointment[]
  duplicates: AdminCustomerDuplicate[]
  statusCounts: Record<AppointmentStatus, number>
  totalAppointments: number
  totalVisits: number
}

export class AdminCustomerProfileError extends Error {
  constructor(
    public readonly code:
      | 'CUSTOMER_NOT_FOUND'
      | 'IDENTITY_CONFLICT'
      | 'INVALID_MERGE',
  ) {
    super(code)
  }
}

export const getAdminCustomerProfile = async (
  database: PrismaClient,
  customerId: string,
  now = new Date(),
): Promise<AdminCustomerProfile | null> => {
  const customer = await database.customer.findFirst({
    where: { id: customerId, anonymizedAt: null },
    select: customerSelect,
  })
  if (!customer) return null

  const [upcoming, history, groupedCounts, pastConfirmedCount, duplicates] =
    await Promise.all([
      database.appointment.findMany({
        where: {
          customerId,
          status: 'CONFIRMED',
          startsAt: { gte: now },
        },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take: 10,
        select: appointmentSelect,
      }),
      database.appointment.findMany({
        where: {
          customerId,
          OR: [{ startsAt: { lt: now } }, { status: { not: 'CONFIRMED' } }],
        },
        orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
        take: 30,
        select: appointmentSelect,
      }),
      database.appointment.groupBy({
        by: ['status'],
        where: { customerId },
        _count: { _all: true },
      }),
      // Une visite réalisée n'est plus marquée à la main : un rendez-vous
      // confirmé dont l'heure est passée en est une.
      database.appointment.count({
        where: { customerId, status: 'CONFIRMED', endsAt: { lt: now } },
      }),
      database.customer.findMany({
        where: {
          id: { not: customerId },
          anonymizedAt: null,
          OR: [
            { emailNormalized: customer.emailNormalized },
            { phoneNormalized: customer.phoneNormalized },
            { searchName: customer.searchName },
          ],
        },
        orderBy: [{ lastSeenAt: 'desc' }, { id: 'asc' }],
        take: 8,
        select: duplicateSelect,
      }),
    ])
  const statusCounts = Object.fromEntries(
    Object.values(AppointmentStatus).map(status => [status, 0]),
  ) as Record<AppointmentStatus, number>
  for (const row of groupedCounts) statusCounts[row.status] = row._count._all
  const totalAppointments = Object.values(statusCounts).reduce(
    (total, count) => total + count,
    0,
  )
  return {
    customer,
    upcoming,
    history,
    duplicates,
    statusCounts,
    totalAppointments,
    // `COMPLETED` ne compte plus que les rendez-vous marqués par l'ancienne
    // interface, quand le statut se posait encore à la main.
    totalVisits: statusCounts.COMPLETED + pastConfirmedCount,
  }
}

export interface UpdateAdminCustomerInput {
  customerId: string
  firstName: string | null
  lastName: string
  email: string
  phone: string
  internalNote: string | null
  preferences: string | null
  propagateFuture: boolean
  now?: Date
}

export const updateAdminCustomer = async (
  database: PrismaClient,
  input: UpdateAdminCustomerInput,
): Promise<{ propagatedAppointments: number }> =>
  database.$transaction(async transaction => {
    const current = await transaction.customer.findFirst({
      where: { id: input.customerId, anonymizedAt: null },
      select: customerSelect,
    })
    if (!current) throw new AdminCustomerProfileError('CUSTOMER_NOT_FOUND')

    // Une adresse ne peut désigner qu'une personne : la corriger vers celle
    // d'une autre fiche demande une fusion, pas une modification.
    const conflict = await transaction.customer.findFirst({
      where: {
        emailNormalized: input.email,
        id: { not: current.id },
      },
      select: { id: true },
    })
    if (conflict) throw new AdminCustomerProfileError('IDENTITY_CONFLICT')

    const searchName = normalizeCustomerSearchName(
      input.firstName,
      input.lastName,
    )
    const identityChanged =
      current.emailNormalized !== input.email ||
      current.phoneNormalized !== input.phone ||
      current.firstName !== input.firstName ||
      current.lastName !== input.lastName
    // `identityVersion` est incrémenté par le trigger PostgreSQL
    // `customer_identity_version_trigger` dès que l'adresse ou le téléphone
    // change : les sessions ouvertes cessent alors d'être valides.
    await transaction.customer.update({
      where: { id: current.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        emailNormalized: input.email,
        phone: input.phone,
        phoneNormalized: input.phone,
        searchName,
        internalNote: input.internalNote,
        preferences: input.preferences,
      },
    })
    const propagated = input.propagateFuture
      ? await transaction.appointment.updateMany({
          where: {
            customerId: current.id,
            status: 'CONFIRMED',
            startsAt: { gte: input.now ?? new Date() },
          },
          data: {
            customerFirstName: input.firstName,
            customerLastName: input.lastName,
            customerSearchName: searchName,
            customerEmail: input.email,
            customerPhone: input.phone,
          },
        })
      : { count: 0 }
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'CUSTOMER',
      entityId: current.id,
      action: 'UPDATED',
      after: {
        identityChanged,
        propagatedAppointments: propagated.count,
        noteChanged: current.internalNote !== input.internalNote,
        preferencesChanged: current.preferences !== input.preferences,
      },
    })
    return { propagatedAppointments: propagated.count }
  })

const combineText = (
  target: string | null,
  source: string | null,
  maxLength: number,
): string | null => {
  if (!source || source === target) return target
  if (!target) return source.slice(0, maxLength)
  return `${target}\n\n${source}`.slice(0, maxLength)
}

export const mergeAdminCustomers = async (
  database: PrismaClient,
  targetId: string,
  sourceId: string,
): Promise<{ movedAppointments: number }> => {
  if (targetId === sourceId)
    throw new AdminCustomerProfileError('INVALID_MERGE')
  return database.$transaction(
    async transaction => {
      const [target, source] = await Promise.all([
        transaction.customer.findFirst({
          where: { id: targetId, anonymizedAt: null },
          select: {
            id: true,
            firstSeenAt: true,
            lastSeenAt: true,
            internalNote: true,
            preferences: true,
          },
        }),
        transaction.customer.findFirst({
          where: { id: sourceId, anonymizedAt: null },
          select: {
            id: true,
            firstSeenAt: true,
            lastSeenAt: true,
            internalNote: true,
            preferences: true,
          },
        }),
      ])
      if (!target || !source)
        throw new AdminCustomerProfileError('INVALID_MERGE')

      const moved = await transaction.appointment.updateMany({
        where: { customerId: source.id },
        data: { customerId: target.id },
      })
      await transaction.customer.update({
        where: { id: target.id },
        data: {
          firstSeenAt:
            target.firstSeenAt < source.firstSeenAt
              ? target.firstSeenAt
              : source.firstSeenAt,
          lastSeenAt:
            target.lastSeenAt > source.lastSeenAt
              ? target.lastSeenAt
              : source.lastSeenAt,
          internalNote: combineText(
            target.internalNote,
            source.internalNote,
            2000,
          ),
          preferences: combineText(target.preferences, source.preferences, 500),
        },
      })
      await transaction.customer.delete({ where: { id: source.id } })
      await writeAuditEvent(transaction, {
        actorType: 'ADMIN',
        actorId: 'admin',
        entityType: 'CUSTOMER',
        entityId: target.id,
        action: 'MERGED',
        after: {
          sourceCustomerId: source.id,
          sourceAppointmentCount: moved.count,
        },
      })
      return { movedAppointments: moved.count }
    },
    { isolationLevel: 'Serializable' },
  )
}
