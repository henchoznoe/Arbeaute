import { normalizeCustomerSearchName } from '@/lib/reservation/customers'
import { normalizeEmail, normalizePhone } from '@/lib/reservation/identity'
import { getLocalDayBounds } from '@/lib/reservation/time'
import type { Prisma, PrismaClient } from '@/prisma/generated/prisma/client'
import type {
  AppointmentSource,
  AppointmentStatus,
} from '@/prisma/generated/prisma/enums'

const ADMIN_SEARCH_PAGE_SIZE = 20
const MAX_ADMIN_SEARCH_PAGE = 500

export interface AdminSearchInput {
  query: string
  serviceId?: string
  status?: AppointmentStatus
  source?: AppointmentSource
  from?: string
  to?: string
  page: number
}

const searchResultSelect = {
  id: true,
  customerId: true,
  customerFirstName: true,
  customerLastName: true,
  customerEmail: true,
  customerPhone: true,
  serviceNameSnapshot: true,
  startsAt: true,
  endsAt: true,
  status: true,
  source: true,
  service: {
    select: {
      color: true,
      category: { select: { name: true } },
    },
  },
} satisfies Prisma.AppointmentSelect

type AdminSearchAppointment = Prisma.AppointmentGetPayload<{
  select: typeof searchResultSelect
}>

export interface AdminSearchPage {
  appointments: AdminSearchAppointment[]
  page: number
  totalPages: number
  totalCount: number
}

const identityWhere = (query: string): Prisma.AppointmentWhereInput => {
  const trimmed = query.trim()
  if (!trimmed) return {}
  try {
    if (trimmed.includes('@')) return { customerEmail: normalizeEmail(trimmed) }
    if (trimmed.replace(/\D/g, '').length >= 8)
      return { customerPhone: normalizePhone(trimmed) }
  } catch {
    return { id: '__invalid_identity_search__' }
  }
  return {
    customerSearchName: {
      contains: normalizeCustomerSearchName(null, trimmed),
    },
  }
}

export const getAdminSearchPage = async (
  database: PrismaClient,
  input: AdminSearchInput,
): Promise<AdminSearchPage> => {
  const from = input.from ? getLocalDayBounds(input.from).start : undefined
  const to = input.to ? getLocalDayBounds(input.to).end : undefined
  const where: Prisma.AppointmentWhereInput = {
    ...identityWhere(input.query),
    serviceId: input.serviceId,
    status: input.status,
    source: input.source,
    startsAt: { gte: from, lt: to },
  }
  const totalCount = await database.appointment.count({ where })
  const totalPages = Math.max(
    1,
    Math.min(
      MAX_ADMIN_SEARCH_PAGE,
      Math.ceil(totalCount / ADMIN_SEARCH_PAGE_SIZE),
    ),
  )
  const page = Math.min(Math.max(1, input.page), totalPages)
  const appointments = await database.appointment.findMany({
    where,
    orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
    skip: (page - 1) * ADMIN_SEARCH_PAGE_SIZE,
    take: ADMIN_SEARCH_PAGE_SIZE,
    select: searchResultSelect,
  })
  return { appointments, page, totalPages, totalCount }
}

export const getAdminSearchServices = (database: PrismaClient) =>
  database.service.findMany({
    orderBy: [
      { category: { sortOrder: 'asc' } },
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      isArchived: true,
      category: { select: { name: true } },
    },
  })

export type AdminSearchService = Awaited<
  ReturnType<typeof getAdminSearchServices>
>[number]
