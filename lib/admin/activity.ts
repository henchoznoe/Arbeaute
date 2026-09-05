import {
  auditActionLabels,
  auditActorLabels,
  auditEntityLabels,
  formatAuditChanges,
  getAuditEntityHref,
} from '@/lib/admin/audit'
import prisma from '@/lib/core/prisma'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import { formatAppointmentDate } from '@/lib/reservation/time'
import { Prisma } from '@/prisma/generated/prisma/client'
import type { AuditEntityType } from '@/prisma/generated/prisma/enums'

export const activityTopics = {
  all: 'Tout',
  appointments: 'Rendez-vous',
  requests: 'Demandes',
  customers: 'Clients',
  services: 'Prestations',
  settings: 'Horaires et réglages',
} as const
export type ActivityTopic = keyof typeof activityTopics

const topicEntities: Record<ActivityTopic, AuditEntityType[]> = {
  all: [],
  appointments: ['APPOINTMENT'],
  requests: ['APPOINTMENT_REQUEST'],
  customers: ['CUSTOMER'],
  services: ['SERVICE', 'SERVICE_CATEGORY'],
  settings: [
    'WEEKLY_AVAILABILITY',
    'AVAILABILITY_EXCEPTION',
    'BOOKING_SETTINGS',
    'AGENDA_SETTINGS',
  ],
}

export interface ActivityItem {
  id: string
  createdAt: Date
  title: string
  actor: string
  subject: string
  details: string[]
  href: string | null
  linkLabel: string
}

interface ActivityRow {
  id: string
  auditId: string | null
  activityId: string | null
  createdAt: Date
  entityType: AuditEntityType
}

// Prisma date les deux insertions séparément. Les nouvelles écritures portent
// un lien explicite ; pour les anciennes, le rendez-vous, l'action et les heures
// enregistrées doivent correspondre. On retient la paire réciproquement la plus
// proche, l'activité précédant le journal de moins d'une minute.
const activityRows = Prisma.sql`
  WITH candidates AS (
    SELECT e.id AS "auditId", a.id AS "activityId",
      ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY
        CASE WHEN e.changes->'after'->>'activityId' = a.id THEN 0 ELSE 1 END,
        ABS(EXTRACT(EPOCH FROM e."createdAt" - a."createdAt")), a.id) AS "auditRank",
      ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY
        CASE WHEN e.changes->'after'->>'activityId' = a.id THEN 0 ELSE 1 END,
        ABS(EXTRACT(EPOCH FROM e."createdAt" - a."createdAt")), e.id) AS "activityRank"
    FROM audit_event e JOIN appointment_activity a ON (
      e.changes->'after'->>'activityId' = a.id
      OR (e.changes->'after'->>'activityId' IS NULL
        AND a."createdAt" <= e."createdAt"
        AND a."createdAt" >= e."createdAt" - INTERVAL '1 minute'
        AND (
          (e."entityType" = 'APPOINTMENT' AND e."actorType" = 'CUSTOMER'
            AND e."entityId" = a."appointmentId" AND e.action::text = a.type::text
            AND (e.changes->'after'->>'startsAt' IS NULL OR e.changes->'after'->>'startsAt' = to_char(a."appointmentStartsAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
            AND (a.type <> 'RESCHEDULED' OR e.changes->'before'->>'startsAt' = to_char(a."previousAppointmentStartsAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
          OR (e."entityType" = 'APPOINTMENT_REQUEST' AND e.action = 'ACCEPTED' AND a.type = 'CREATED'
            AND (EXISTS (SELECT 1 FROM appointment_request r WHERE r.id = e."entityId" AND r."appointmentId" = a."appointmentId")
              OR (NOT EXISTS (SELECT 1 FROM appointment_request r WHERE r.id = e."entityId")
                AND e."entityLabel" = a."serviceNameSnapshot"
                AND e.changes->'after'->>'requestedStartsAt' = to_char(a."appointmentStartsAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))))
        )
      )
    )
  ), matched AS (
    SELECT "auditId", "activityId" FROM candidates WHERE "auditRank" = 1 AND "activityRank" = 1
  ), activity_rows AS (
    SELECT 'audit:' || e.id AS id, e.id AS "auditId",
      (SELECT MIN(m."activityId") FROM matched m WHERE m."auditId" = e.id) AS "activityId", e."createdAt", e."entityType"
    FROM audit_event e
    UNION ALL
    SELECT 'activity:' || a.id, NULL, a.id, a."createdAt", 'APPOINTMENT'::"AuditEntityType"
    FROM appointment_activity a WHERE NOT EXISTS (SELECT 1 FROM matched m WHERE m."activityId" = a.id)
  )`

const hydrateActivities = async (
  rows: ActivityRow[],
): Promise<ActivityItem[]> => {
  if (!rows.length) return []
  const [events, activities] = await Promise.all([
    prisma.auditEvent.findMany({
      where: {
        id: { in: rows.flatMap(row => (row.auditId ? [row.auditId] : [])) },
      },
    }),
    prisma.appointmentActivity.findMany({
      where: {
        id: {
          in: rows.flatMap(row => (row.activityId ? [row.activityId] : [])),
        },
      },
    }),
  ])
  const idsFor = (entity: AuditEntityType) =>
    events
      .filter(event => event.entityType === entity)
      .map(event => event.entityId)
  const [requests, customers, services] = await Promise.all([
    prisma.appointmentRequest.findMany({
      where: { id: { in: idsFor('APPOINTMENT_REQUEST') } },
      select: {
        id: true,
        appointmentId: true,
        requestedStartsAt: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.customer.findMany({
      where: { id: { in: idsFor('CUSTOMER') } },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.service.findMany({
      where: { id: { in: idsFor('SERVICE') } },
      select: { id: true },
    }),
  ])
  const appointments = await prisma.appointment.findMany({
    where: {
      id: {
        in: [
          ...idsFor('APPOINTMENT'),
          ...activities.flatMap(a =>
            a.appointmentId ? [a.appointmentId] : [],
          ),
          ...requests.flatMap(r => (r.appointmentId ? [r.appointmentId] : [])),
        ],
      },
    },
    select: {
      id: true,
      customerFirstName: true,
      customerLastName: true,
      service: { select: { category: { select: { name: true } } } },
    },
  })
  return rows.map(row => {
    const event = events.find(event => event.id === row.auditId)
    const activity = activities.find(activity => activity.id === row.activityId)
    const request = requests.find(
      request =>
        event?.entityType === 'APPOINTMENT_REQUEST' &&
        request.id === event.entityId,
    )
    const appointmentId =
      event?.entityType === 'APPOINTMENT'
        ? event.entityId
        : (request?.appointmentId ?? activity?.appointmentId)
    const appointment = appointments.find(a => a.id === appointmentId)
    const customer = customers.find(
      customer =>
        event?.entityType === 'CUSTOMER' && customer.id === event.entityId,
    )
    const name = appointment
      ? [appointment.customerFirstName, appointment.customerLastName]
          .filter(Boolean)
          .join(' ')
      : request
        ? [request.customer.firstName, request.customer.lastName]
            .filter(Boolean)
            .join(' ')
        : customer
          ? [customer.firstName, customer.lastName].filter(Boolean).join(' ')
          : activity
            ? [
                activity.customerFirstNameSnapshot,
                activity.customerLastNameSnapshot,
              ]
                .filter(Boolean)
                .join(' ')
            : ''
    const root =
      event?.changes &&
      typeof event.changes === 'object' &&
      !Array.isArray(event.changes)
        ? event.changes
        : {}
    const before =
      root.before &&
      typeof root.before === 'object' &&
      !Array.isArray(root.before)
        ? root.before
        : {}
    const after =
      root.after && typeof root.after === 'object' && !Array.isArray(root.after)
        ? root.after
        : {}
    const appointmentEvent = event?.entityType === 'APPOINTMENT'
    const details = event
      ? formatAuditChanges(event.changes).filter(
          detail =>
            (!(activity || appointmentEvent) ||
              !detail.startsWith('Horaire :')) &&
            (!activity || !detail.startsWith('Heure demandée :')),
        )
      : []
    if (appointmentEvent && !activity) {
      const previous =
        typeof before.startsAt === 'string' ? new Date(before.startsAt) : null
      const next =
        typeof after.startsAt === 'string' ? new Date(after.startsAt) : null
      if (previous && next && previous.getTime() !== next.getTime()) {
        if (!Number.isNaN(previous.getTime()))
          details.unshift(`Ancien horaire : ${formatAppointmentDate(previous)}`)
        if (!Number.isNaN(next.getTime()))
          details.unshift(`Nouvel horaire : ${formatAppointmentDate(next)}`)
      } else {
        const moment = next ?? previous
        if (moment && !Number.isNaN(moment.getTime()))
          details.unshift(`Rendez-vous : ${formatAppointmentDate(moment)}`)
      }
    }
    if (activity) {
      if (activity.previousAppointmentStartsAt)
        details.unshift(
          `Ancien horaire : ${formatAppointmentDate(activity.previousAppointmentStartsAt)}`,
        )
      details.unshift(
        `${activity.type === 'RESCHEDULED' ? 'Nouvel horaire' : 'Rendez-vous'} : ${formatAppointmentDate(activity.appointmentStartsAt)}`,
      )
    }
    if (request && !activity)
      details.unshift(
        `Heure demandée : ${formatAppointmentDate(request.requestedStartsAt)}`,
      )
    let href = event
      ? getAuditEntityHref(event)
      : appointment
        ? `/admin/appointments/${appointment.id}`
        : null
    if (event?.entityType === 'APPOINTMENT' && !appointment) href = null
    if (event?.entityType === 'CUSTOMER' && !customer) href = null
    if (
      event?.entityType === 'SERVICE' &&
      !services.some(service => service.id === event.entityId)
    )
      href = null
    if (event?.entityType === 'APPOINTMENT_REQUEST' && !request) href = null
    if (event?.action === 'DELETED') href = null
    const moved =
      event?.entityType === 'APPOINTMENT' &&
      before.startsAt &&
      after.startsAt &&
      before.startsAt !== after.startsAt
    const action = moved
      ? 'RESCHEDULED'
      : (event?.action ?? activity?.type ?? 'UPDATED')
    const title =
      event?.entityType === 'APPOINTMENT' || !event
        ? ({
            CREATED: 'Rendez-vous réservé',
            RESCHEDULED: 'Rendez-vous déplacé',
            CANCELLED: 'Rendez-vous annulé',
          }[action as string] ?? auditActionLabels[action])
        : auditActionLabels[action]
    return {
      id: row.id,
      createdAt: row.createdAt,
      title,
      actor: event ? auditActorLabels[event.actorType] : 'Depuis le site',
      subject: [
        name,
        appointment || activity
          ? formatServiceLabel(
              activity?.serviceNameSnapshot ??
                event?.entityLabel ??
                'Rendez-vous',
              appointment?.service?.category?.name,
            )
          : (event?.entityLabel ??
            (event ? auditEntityLabels[event.entityType] : 'Rendez-vous')),
      ]
        .filter(Boolean)
        .join(' · '),
      details: [...new Set(details)],
      href,
      linkLabel:
        event?.entityType === 'APPOINTMENT_REQUEST'
          ? 'Voir les demandes'
          : appointment
            ? 'Voir le rendez-vous'
            : customer
              ? 'Voir le client'
              : 'Voir les détails',
    }
  })
}

export const getActivityPage = async (
  requestedPage: number,
  topic: ActivityTopic = 'all',
) => {
  const entities = topicEntities[topic]
  const filter = entities.length
    ? Prisma.sql`WHERE "entityType"::text IN (${Prisma.join(entities)})`
    : Prisma.empty
  const [count] = await prisma.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`${activityRows} SELECT COUNT(*) AS count FROM activity_rows ${filter}`,
  )
  const totalCount = Number(count.count)
  const totalPages = Math.max(1, Math.ceil(totalCount / 20))
  const page = Math.min(
    Math.max(1, Number.isInteger(requestedPage) ? requestedPage : 1),
    totalPages,
  )
  const rows = await prisma.$queryRaw<ActivityRow[]>(
    Prisma.sql`${activityRows} SELECT * FROM activity_rows ${filter} ORDER BY "createdAt" DESC, id DESC LIMIT 20 OFFSET ${(page - 1) * 20}`,
  )
  return {
    activities: await hydrateActivities(rows),
    page,
    totalPages,
    totalCount,
  }
}

export const getActivityOverview = async () => {
  const rows = await prisma.$queryRaw<ActivityRow[]>(
    Prisma.sql`${activityRows} SELECT * FROM activity_rows ORDER BY "createdAt" DESC, id DESC LIMIT 3`,
  )
  return { activities: await hydrateActivities(rows) }
}
