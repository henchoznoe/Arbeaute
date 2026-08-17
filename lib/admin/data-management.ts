import { formatInTimeZone } from 'date-fns-tz'
import { writeAuditEvent } from '@/lib/admin/audit'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { getLocalDayBounds } from '@/lib/reservation/time'
import type { PrismaClient } from '@/prisma/generated/prisma/client'
import type { AppointmentStatus } from '@/prisma/generated/prisma/enums'

const EXPORT_ROW_LIMIT = 10_000

type CsvValue = string | number | boolean | Date | null | undefined

interface CsvColumn<Row> {
  header: string
  value: (row: Row) => CsvValue
}

const protectSpreadsheetFormula = (value: string): string =>
  /^[=+\-@]/.test(value) ? `'${value}` : value

const csvCell = (value: CsvValue): string => {
  const text = protectSpreadsheetFormula(
    value instanceof Date ? value.toISOString() : String(value ?? ''),
  )
  return `"${text.replaceAll('"', '""')}"`
}

export const createCsv = <Row>(
  columns: CsvColumn<Row>[],
  rows: Row[],
): string =>
  `\uFEFF${[
    columns.map(column => csvCell(column.header)).join(';'),
    ...rows.map(row =>
      columns.map(column => csvCell(column.value(row))).join(';'),
    ),
  ].join('\r\n')}\r\n`

const formatLocalDateTime = (date: Date): string =>
  formatInTimeZone(date, RESERVATION_TIME_ZONE, 'yyyy-MM-dd HH:mm')

export const exportColumnDocumentation = {
  appointments: [
    'Identifiant',
    'Statut et source',
    'Début et fin (Europe/Zurich)',
    'Prestation, prix et durée figés',
    'Coordonnées utilisées lors de la réservation',
    'Commentaire et date de création',
  ],
  customers: [
    'Identifiant',
    'Coordonnées courantes normalisées',
    'Préférences et note interne',
    'Première et dernière activité connue',
    'Date d’anonymisation',
    'Nombre de rendez-vous liés',
  ],
  catalog: [
    'Catégorie et prestation',
    'Prix et durées',
    'Visibilité, réservation et archivage',
    'Ordres d’affichage',
  ],
} as const

export interface AppointmentExportFilters {
  from?: string
  to?: string
  status?: AppointmentStatus
}

export const createAppointmentsExport = async (
  database: PrismaClient,
  filters: AppointmentExportFilters,
): Promise<string> => {
  const from = filters.from ? getLocalDayBounds(filters.from).start : undefined
  const to = filters.to ? getLocalDayBounds(filters.to).end : undefined
  const appointments = await database.appointment.findMany({
    where: {
      status: filters.status,
      startsAt: { gte: from, lt: to },
    },
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    take: EXPORT_ROW_LIMIT,
  })
  return createCsv(
    [
      { header: 'id', value: row => row.id },
      { header: 'statut', value: row => row.status },
      { header: 'source', value: row => row.source },
      { header: 'debut', value: row => formatLocalDateTime(row.startsAt) },
      { header: 'fin', value: row => formatLocalDateTime(row.endsAt) },
      { header: 'prestation', value: row => row.serviceNameSnapshot },
      {
        header: 'prix_chf',
        value: row => (row.servicePriceCents / 100).toFixed(2),
      },
      {
        header: 'duree_minutes',
        value: row => row.serviceDurationMinutes,
      },
      { header: 'prenom', value: row => row.customerFirstName },
      { header: 'nom', value: row => row.customerLastName },
      { header: 'email', value: row => row.customerEmail },
      { header: 'telephone', value: row => row.customerPhone },
      { header: 'commentaire', value: row => row.comment },
      { header: 'cree_le', value: row => formatLocalDateTime(row.createdAt) },
    ],
    appointments,
  )
}

export const createCustomersExport = async (
  database: PrismaClient,
): Promise<string> => {
  const customers = await database.customer.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
    take: EXPORT_ROW_LIMIT,
    include: { _count: { select: { appointments: true } } },
  })
  return createCsv(
    [
      { header: 'id', value: row => row.id },
      { header: 'prenom', value: row => row.firstName },
      { header: 'nom', value: row => row.lastName },
      { header: 'email', value: row => row.email },
      { header: 'telephone', value: row => row.phone },
      { header: 'preferences', value: row => row.preferences },
      { header: 'note_interne', value: row => row.internalNote },
      {
        header: 'premiere_activite',
        value: row => formatLocalDateTime(row.firstSeenAt),
      },
      {
        header: 'derniere_activite',
        value: row => formatLocalDateTime(row.lastSeenAt),
      },
      {
        header: 'anonymisee_le',
        value: row =>
          row.anonymizedAt ? formatLocalDateTime(row.anonymizedAt) : null,
      },
      {
        header: 'nombre_rendez_vous',
        value: row => row._count.appointments,
      },
    ],
    customers,
  )
}

export const createCatalogExport = async (
  database: PrismaClient,
): Promise<string> => {
  const services = await database.service.findMany({
    orderBy: [
      { category: { sortOrder: 'asc' } },
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
    take: EXPORT_ROW_LIMIT,
    include: { category: true },
  })
  return createCsv(
    [
      { header: 'categorie', value: row => row.category?.name },
      { header: 'categorie_slug', value: row => row.category?.slug },
      { header: 'categorie_active', value: row => row.category?.isActive },
      { header: 'categorie_ordre', value: row => row.category?.sortOrder },
      { header: 'prestation', value: row => row.name },
      { header: 'slug', value: row => row.slug },
      { header: 'prix_chf', value: row => (row.priceCents / 100).toFixed(2) },
      { header: 'duree_minutes', value: row => row.durationMinutes },
      { header: 'preparation_minutes', value: row => row.preparationMinutes },
      { header: 'rangement_minutes', value: row => row.cleanupMinutes },
      { header: 'reservable', value: row => row.isBookable },
      { header: 'visible', value: row => row.isVisible },
      { header: 'archivee', value: row => row.isArchived },
      { header: 'ordre', value: row => row.sortOrder },
    ],
    services,
  )
}

export interface AnonymizationPreview {
  customerId: string
  displayName: string
  appointmentCount: number
  activityCount: number
  confirmation: string
}

export const getAnonymizationConfirmation = (
  appointmentCount: number,
): string => `ANONYMISER ${appointmentCount} RENDEZ-VOUS`

export const getCustomerAnonymizationPreview = async (
  database: PrismaClient,
  emailNormalized: string,
): Promise<AnonymizationPreview | null> => {
  const customer = await database.customer.findUnique({
    where: { emailNormalized },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      anonymizedAt: true,
      _count: { select: { appointments: true } },
    },
  })
  if (!customer || customer.anonymizedAt) return null
  const activityCount = await database.appointmentActivity.count({
    where: { appointment: { customerId: customer.id } },
  })
  return {
    customerId: customer.id,
    displayName: [customer.firstName, customer.lastName]
      .filter(Boolean)
      .join(' '),
    appointmentCount: customer._count.appointments,
    activityCount,
    confirmation: getAnonymizationConfirmation(customer._count.appointments),
  }
}

export const anonymizeCustomer = async (
  database: PrismaClient,
  customerId: string,
  confirmation: string,
): Promise<{ appointmentCount: number; activityCount: number }> =>
  database.$transaction(async transaction => {
    const customer = await transaction.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        anonymizedAt: true,
        _count: { select: { appointments: true } },
      },
    })
    if (!customer || customer.anonymizedAt)
      throw new Error('CUSTOMER_UNAVAILABLE')
    const expected = getAnonymizationConfirmation(customer._count.appointments)
    if (confirmation !== expected) throw new Error('INVALID_CONFIRMATION')

    const anonymizedAt = new Date()
    const placeholder = `anonymized-${customer.id}`
    const activities = await transaction.appointmentActivity.updateMany({
      where: { appointment: { customerId: customer.id } },
      data: {
        customerFirstNameSnapshot: null,
        customerLastNameSnapshot: 'Coordonnées effacées',
      },
    })
    const appointments = await transaction.appointment.updateMany({
      where: { customerId: customer.id },
      data: {
        customerFirstName: null,
        customerLastName: 'Coordonnées effacées',
        customerSearchName: 'coordonnees effacees',
        customerEmail: null,
        customerPhone: null,
        comment: null,
      },
    })
    // L'adresse de remplacement reste unique, et son changement fait incrémenter
    // `identityVersion` par le trigger PostgreSQL : la session ouverte de la
    // personne cesse aussitôt d'être valide.
    await transaction.customer.update({
      where: { id: customer.id },
      data: {
        firstName: null,
        lastName: 'Coordonnées effacées',
        email: `${placeholder}@invalid.local`,
        emailNormalized: `${placeholder}@invalid.local`,
        phone: placeholder,
        phoneNormalized: placeholder,
        searchName: 'coordonnees effacees',
        internalNote: null,
        preferences: null,
        anonymizedAt,
      },
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      action: 'ANONYMIZED',
      before: {
        appointmentCount: appointments.count,
        activityCount: activities.count,
      },
      after: { anonymized: true },
    })
    return {
      appointmentCount: appointments.count,
      activityCount: activities.count,
    }
  })
