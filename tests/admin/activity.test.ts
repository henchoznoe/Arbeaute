import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  events: vi.fn(),
  activities: vi.fn(),
  appointments: vi.fn(),
  requests: vi.fn(),
  customers: vi.fn(),
  services: vi.fn(),
}))
vi.mock('@/lib/core/prisma', () => ({
  default: {
    $queryRaw: mocks.query,
    auditEvent: { findMany: mocks.events },
    appointmentActivity: { findMany: mocks.activities },
    appointment: { findMany: mocks.appointments },
    appointmentRequest: { findMany: mocks.requests },
    customer: { findMany: mocks.customers },
    service: { findMany: mocks.services },
  },
}))

import { getActivityOverview, getActivityPage } from '@/lib/admin/activity'

const createdAt = new Date('2026-09-05T08:00Z')
const event = {
  id: 'e',
  actorType: 'CUSTOMER',
  entityType: 'APPOINTMENT',
  entityId: 'rdv',
  entityLabel: 'Soin',
  action: 'RESCHEDULED',
  changes: {
    before: { startsAt: '2026-09-06T08:00Z' },
    after: { startsAt: '2026-09-07T08:00Z' },
  },
  createdAt,
}
const activity = {
  id: 'a',
  appointmentId: 'rdv',
  type: 'RESCHEDULED',
  customerFirstNameSnapshot: 'Marie',
  customerLastNameSnapshot: 'Martin',
  serviceNameSnapshot: 'Soin réservé',
  appointmentStartsAt: new Date('2026-09-07T08:00Z'),
  previousAppointmentStartsAt: new Date('2026-09-06T08:00Z'),
  createdAt,
}
const row = {
  id: 'audit:e',
  auditId: 'e',
  activityId: 'a',
  createdAt,
  entityType: 'APPOINTMENT',
}

describe('activité unifiée', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.events.mockResolvedValue([event])
    mocks.activities.mockResolvedValue([activity])
    mocks.requests.mockResolvedValue([])
    mocks.customers.mockResolvedValue([])
    mocks.services.mockResolvedValue([])
    mocks.appointments.mockResolvedValue([
      { id: 'rdv', customerFirstName: 'Marie', customerLastName: 'Martin' },
    ])
    mocks.query.mockResolvedValue([row])
  })
  it('présente une seule activité enrichie avec les deux horaires et un lien', async () => {
    const { activities } = await getActivityOverview()
    expect(activities).toHaveLength(1)
    expect(activities[0]).toMatchObject({
      title: 'Rendez-vous déplacé',
      subject: 'Marie Martin · Soin réservé',
      actor: 'Depuis le site',
      href: '/admin/appointments/rdv',
    })
    expect(activities[0].details).toEqual([
      'Nouvel horaire : lundi 7 septembre 2026 à 10:00',
      'Ancien horaire : dimanche 6 septembre 2026 à 10:00',
    ])
  })
  it('garde l’horaire enregistré d’une annulation manuelle même s’il n’a pas changé', async () => {
    mocks.query.mockResolvedValue([{ ...row, activityId: null }])
    mocks.activities.mockResolvedValue([])
    mocks.events.mockResolvedValue([
      {
        ...event,
        actorType: 'ADMIN',
        action: 'CANCELLED',
        changes: {
          before: { startsAt: '2026-09-06T08:00Z', status: 'CONFIRMED' },
          after: { startsAt: '2026-09-06T08:00Z', status: 'CANCELLED' },
        },
      },
    ])
    const { activities } = await getActivityOverview()
    expect(activities[0].details).toContain(
      'Rendez-vous : dimanche 6 septembre 2026 à 10:00',
    )
  })

  it('présente les deux horaires d’un déplacement fait par Arzu', async () => {
    mocks.query.mockResolvedValue([{ ...row, activityId: null }])
    mocks.activities.mockResolvedValue([])
    mocks.events.mockResolvedValue([
      { ...event, actorType: 'ADMIN', action: 'UPDATED' },
    ])
    const { activities } = await getActivityOverview()
    expect(activities[0]).toMatchObject({
      title: 'Rendez-vous déplacé',
      actor: 'Arzu',
    })
    expect(activities[0].details).toContain(
      'Ancien horaire : dimanche 6 septembre 2026 à 10:00',
    )
    expect(activities[0].details).toContain(
      'Nouvel horaire : lundi 7 septembre 2026 à 10:00',
    )
  })

  it('conserve les annulations consultables', async () => {
    mocks.events.mockResolvedValue([
      {
        ...event,
        action: 'CANCELLED',
        changes: { after: { status: 'CANCELLED' } },
      },
    ])
    mocks.activities.mockResolvedValue([
      { ...activity, type: 'CANCELLED', previousAppointmentStartsAt: null },
    ])
    const { activities } = await getActivityOverview()
    expect(activities[0]).toMatchObject({
      title: 'Rendez-vous annulé',
      href: '/admin/appointments/rdv',
    })
  })
  it('garde une ancienne activité sans événement associé ni rendez-vous existant', async () => {
    mocks.query.mockResolvedValue([{ ...row, id: 'activity:a', auditId: null }])
    mocks.events.mockResolvedValue([])
    mocks.appointments.mockResolvedValue([])
    const { activities } = await getActivityOverview()
    expect(activities[0]).toMatchObject({
      subject: 'Marie Martin · Soin réservé',
      href: null,
    })
  })
  it('ne réaffiche pas un ancien nom après effacement des coordonnées', async () => {
    mocks.appointments.mockResolvedValue([
      {
        id: 'rdv',
        customerFirstName: null,
        customerLastName: 'Coordonnées effacées',
      },
    ])
    const { activities } = await getActivityOverview()
    expect(activities[0].subject).toBe('Coordonnées effacées · Soin réservé')
  })
  it('regroupe une demande acceptée et sa réservation avec le bon auteur', async () => {
    mocks.events.mockResolvedValue([
      {
        ...event,
        actorType: 'ADMIN',
        entityType: 'APPOINTMENT_REQUEST',
        entityId: 'request',
        action: 'ACCEPTED',
        changes: {},
      },
    ])
    mocks.requests.mockResolvedValue([
      {
        id: 'request',
        appointmentId: 'rdv',
        customer: { firstName: 'Marie', lastName: 'Martin' },
        requestedStartsAt: activity.appointmentStartsAt,
      },
    ])
    mocks.activities.mockResolvedValue([
      { ...activity, type: 'CREATED', previousAppointmentStartsAt: null },
    ])
    const { activities } = await getActivityOverview()
    expect(activities).toHaveLength(1)
    expect(activities[0]).toMatchObject({
      title: 'Demande acceptée',
      actor: 'Arzu',
      href: '/admin/demandes',
    })
  })
  it('conserve plus de quatre détails et retire les liens des prestations supprimées', async () => {
    mocks.query.mockResolvedValue([{ ...row, activityId: null }])
    mocks.activities.mockResolvedValue([])
    mocks.events.mockResolvedValue([
      {
        ...event,
        entityType: 'SERVICE',
        entityId: 'service',
        action: 'UPDATED',
        changes: {
          after: {
            name: 'Soin',
            durationMinutes: 45,
            priceCents: 6000,
            preparationMinutes: 15,
            cleanupMinutes: 10,
            isVisible: false,
          },
        },
      },
    ])
    const { activities } = await getActivityOverview()
    expect(activities[0].details).toHaveLength(6)
    expect(activities[0].href).toBeNull()
  })
  it('borne la pagination après le dédoublonnage avec un filtre paramétré', async () => {
    mocks.query
      .mockResolvedValueOnce([{ count: 45n }])
      .mockResolvedValueOnce([row])
    const result = await getActivityPage(99, 'appointments')
    expect(result).toMatchObject({ page: 3, totalPages: 3, totalCount: 45 })
    const query = mocks.query.mock.calls[1][0]
    expect(query.values).toContain('APPOINTMENT')
    expect(query.values.at(-1)).toBe(40)
    expect(query.sql).toContain(
      'ORDER BY "createdAt" DESC, id DESC LIMIT 20 OFFSET',
    )
    expect(query.sql).not.toContain('readAt')
    expect(query.sql).toContain("e.changes->'after'->>'activityId' = a.id")
    expect(query.sql).toContain("INTERVAL '1 minute'")
    expect(query.sql).toContain('"auditRank" = 1 AND "activityRank" = 1')
    expect(query.sql).not.toContain('a."createdAt" = e."createdAt"')
  })
})
