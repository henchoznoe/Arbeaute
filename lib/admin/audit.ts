import prisma from '@/lib/core/prisma'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import type { Prisma, PrismaClient } from '@/prisma/generated/prisma/client'
import type {
  AuditActionType,
  AuditActorType,
  AuditEntityType,
} from '@/prisma/generated/prisma/enums'

type AuditValue = string | number | boolean | null

export interface AuditEventInput {
  actorType: AuditActorType
  actorId: string
  entityType: AuditEntityType
  entityId: string
  entityLabel?: string | null
  action: AuditActionType
  before?: Record<string, AuditValue>
  after?: Record<string, AuditValue>
}

export const writeAuditEvent = (
  transaction: Prisma.TransactionClient,
  { before, after, ...event }: AuditEventInput,
) =>
  transaction.auditEvent.create({
    data: {
      ...event,
      changes:
        before || after
          ? ({ before: before ?? {}, after: after ?? {} } as Prisma.JsonObject)
          : undefined,
    },
  })

export const runAuditedMutation = async <Result>(
  database: PrismaClient,
  mutation: (transaction: Prisma.TransactionClient) => Promise<Result>,
  event: (result: Result) => AuditEventInput,
): Promise<Result> =>
  database.$transaction(async transaction => {
    const result = await mutation(transaction)
    await writeAuditEvent(transaction, event(result))
    return result
  })

const AUDIT_PAGE_SIZE = 20

export interface AuditFilters {
  actor?: AuditActorType
  entity?: AuditEntityType
  action?: AuditActionType
}

const auditEventSelect = {
  id: true,
  actorType: true,
  actorId: true,
  entityType: true,
  entityId: true,
  entityLabel: true,
  action: true,
  changes: true,
  createdAt: true,
} satisfies Prisma.AuditEventSelect

export type AuditEventItem = Prisma.AuditEventGetPayload<{
  select: typeof auditEventSelect
}>

export const getAuditPage = async (
  requestedPage: number,
  filters: AuditFilters,
) => {
  const where = {
    actorType: filters.actor,
    entityType: filters.entity,
    action: filters.action,
  }
  const totalCount = await prisma.auditEvent.count({ where })
  const totalPages = Math.max(1, Math.ceil(totalCount / AUDIT_PAGE_SIZE))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * AUDIT_PAGE_SIZE,
    take: AUDIT_PAGE_SIZE,
    select: auditEventSelect,
  })
  return { events, page, totalPages, totalCount }
}

export const auditActorLabels: Record<AuditActorType, string> = {
  ADMIN: 'Arzu',
  CUSTOMER: 'Cliente',
}

export const auditEntityLabels: Record<AuditEntityType, string> = {
  APPOINTMENT: 'Rendez-vous',
  CUSTOMER: 'Cliente',
  SERVICE: 'Prestation',
  SERVICE_CATEGORY: 'Catégorie',
  WEEKLY_AVAILABILITY: 'Horaire de la semaine',
  AVAILABILITY_EXCEPTION: 'Jour particulier',
  BOOKING_SETTINGS: 'Règles de réservation',
}

export const auditActionLabels: Record<AuditActionType, string> = {
  CREATED: 'Création',
  UPDATED: 'Modification',
  DELETED: 'Suppression',
  CANCELLED: 'Annulation',
  RESCHEDULED: 'Déplacement',
  REORDERED: 'Ordre changé',
  ARCHIVED: 'Mise de côté',
  RESTORED: 'Rétablissement',
  FILE_ASSIGNED: 'Fichier ajouté',
  FILE_REMOVED: 'Fichier retiré',
  ANONYMIZED: 'Coordonnées effacées',
  MERGED: 'Fusion',
}

export const formatAuditCreatedAt = (date: Date): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: RESERVATION_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)

export const getAuditEntityHref = (
  event: Pick<AuditEventItem, 'entityType' | 'entityId'>,
): string | null => {
  if (event.entityType === 'APPOINTMENT')
    return `/admin/appointments/${event.entityId}`
  if (event.entityType === 'SERVICE') return `/admin/services/${event.entityId}`
  if (event.entityType === 'SERVICE_CATEGORY') return '/admin/services'
  if (event.entityType === 'CUSTOMER')
    return `/admin/customers/${event.entityId}`
  if (
    event.entityType === 'WEEKLY_AVAILABILITY' ||
    event.entityType === 'AVAILABILITY_EXCEPTION'
  )
    return '/admin/availability'
  if (event.entityType === 'BOOKING_SETTINGS') return '/admin/settings/booking'
  return null
}

const changeFieldLabels: Record<string, string> = {
  name: 'Nom',
  startsAt: 'Début',
  status: 'Statut',
  priceCents: 'Prix',
  durationMinutes: 'Durée',
  preparationMinutes: 'Préparation',
  cleanupMinutes: 'Rangement',
  isBookable: 'Réservable',
  isVisible: 'Visible',
  isArchived: 'Archivée',
  isActive: 'Active',
  sortOrder: 'Position',
  color: 'Couleur',
  startMinute: 'Début',
  endMinute: 'Fin',
  from: 'Du',
  to: 'Au',
  count: 'Nombre de jours',
  minBookingNoticeHours: 'Préavis minimum',
  bookingHorizonMonths: 'Horizon de réservation',
  customerChangeCutoffHours: 'Délai de modification',
  slotIntervalMinutes: 'Pas des créneaux',
  type: 'Type',
  hadImage: 'Image présente',
  hasImage: 'Image présente',
  hadConsentForm: 'Consentement présent',
  hasConsentForm: 'Consentement présent',
  identityChanged: 'Coordonnées modifiées',
  propagatedAppointments: 'Rendez-vous futurs actualisés',
  noteChanged: 'Note interne modifiée',
  preferencesChanged: 'Préférences modifiées',
  sourceCustomerId: 'Fiche source',
  sourceAppointmentCount: 'Rendez-vous fusionnés',
}

const asJsonObject = (
  value: Prisma.JsonValue | undefined,
): Prisma.JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}

const appointmentStatusLabels: Record<string, string> = {
  CONFIRMED: 'Confirmé',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  NO_SHOW: 'Absence',
}

const formatAuditValue = (key: string, value: Prisma.JsonValue): string => {
  if (value === null) return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (key === 'status' && typeof value === 'string')
    return appointmentStatusLabels[value] ?? value
  if (key === 'priceCents' && typeof value === 'number')
    return `${(value / 100).toLocaleString('fr-CH')} CHF`
  if (
    ['durationMinutes', 'preparationMinutes', 'cleanupMinutes'].includes(key) &&
    typeof value === 'number'
  )
    return `${value} min`
  if (['startMinute', 'endMinute'].includes(key) && typeof value === 'number')
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
  if (
    ['minBookingNoticeHours', 'customerChangeCutoffHours'].includes(key) &&
    typeof value === 'number'
  )
    return `${value} h`
  if (key === 'bookingHorizonMonths' && typeof value === 'number')
    return `${value} mois`
  if (key === 'slotIntervalMinutes' && typeof value === 'number')
    return `${value} min`
  if (
    ['startsAt', 'from', 'to'].includes(key) &&
    typeof value === 'string' &&
    !Number.isNaN(Date.parse(value))
  )
    return formatAuditCreatedAt(new Date(value))
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : 'Modifié'
}

export const formatAuditChanges = (
  changes: Prisma.JsonValue | null,
): string[] => {
  const root = asJsonObject(changes ?? undefined)
  const before = asJsonObject(root.before)
  const after = asJsonObject(root.after)
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  return keys
    .filter(key => key in changeFieldLabels && before[key] !== after[key])
    .slice(0, 4)
    .map(key => {
      const label = changeFieldLabels[key]
      const previous = before[key]
      const next = after[key]
      if (previous === undefined && next !== undefined)
        return `${label} : ${formatAuditValue(key, next)}`
      if (next === undefined && previous !== undefined)
        return `${label} : ${formatAuditValue(key, previous)}`
      return `${label} : ${formatAuditValue(key, previous ?? null)} → ${formatAuditValue(key, next ?? null)}`
    })
}
