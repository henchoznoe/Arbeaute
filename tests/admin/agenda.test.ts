import { describe, expect, it, vi } from 'vitest'
import {
  AdminAppointmentSeriesError,
  buildAdminAppointmentSeriesStarts,
  buildAvailabilityExceptionRows,
  createAdminAppointmentSeriesSerializable,
  isInsidePublicOpening,
  mergeIntervals,
  previewAdminAppointmentSeries,
  saveAdminAppointmentSerializable,
} from '@/lib/admin/agenda'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

const interval = (start: string, end: string) => ({
  start: new Date(start),
  end: new Date(end),
})

describe('admin agenda public-hours warning', () => {
  it('accepts an appointment fully contained in a weekly opening', () => {
    expect(
      isInsidePublicOpening({
        occupied: interval('2026-08-10T06:30:00Z', '2026-08-10T07:30:00Z'),
        weekly: [interval('2026-08-10T06:00:00Z', '2026-08-10T09:30:00Z')],
        available: [],
        unavailable: [],
      }),
    ).toBe(true)
  })

  it('accepts an exceptional opening outside the weekly schedule', () => {
    expect(
      isInsidePublicOpening({
        occupied: interval('2026-08-13T08:00:00Z', '2026-08-13T09:00:00Z'),
        weekly: [],
        available: [interval('2026-08-13T07:00:00Z', '2026-08-13T10:00:00Z')],
        unavailable: [],
      }),
    ).toBe(true)
  })

  it('warns when an unavailability intersects preparation or cleanup', () => {
    expect(
      isInsidePublicOpening({
        occupied: interval('2026-08-10T06:45:00Z', '2026-08-10T08:00:00Z'),
        weekly: [interval('2026-08-10T06:00:00Z', '2026-08-10T09:30:00Z')],
        available: [],
        unavailable: [interval('2026-08-10T07:55:00Z', '2026-08-10T08:30:00Z')],
      }),
    ).toBe(false)
  })

  it('warns when the appointment crosses the midday break', () => {
    expect(
      isInsidePublicOpening({
        occupied: interval('2026-08-10T09:00:00Z', '2026-08-10T12:00:00Z'),
        weekly: [
          interval('2026-08-10T06:00:00Z', '2026-08-10T09:30:00Z'),
          interval('2026-08-10T11:30:00Z', '2026-08-10T16:30:00Z'),
        ],
        available: [],
        unavailable: [],
      }),
    ).toBe(false)
  })

  it('merges adjacent openings without mutating their input', () => {
    const first = interval('2026-08-10T06:00:00Z', '2026-08-10T08:00:00Z')
    const merged = mergeIntervals([
      first,
      interval('2026-08-10T08:00:00Z', '2026-08-10T09:00:00Z'),
    ])
    expect(merged).toEqual([
      interval('2026-08-10T06:00:00Z', '2026-08-10T09:00:00Z'),
    ])
    expect(first.end.toISOString()).toBe('2026-08-10T08:00:00.000Z')
  })
})

describe('multi-day availability exceptions', () => {
  it('repeats the same daily time range across a date span', () => {
    const rows = buildAvailabilityExceptionRows({
      type: 'UNAVAILABLE',
      startDateKey: '2026-08-20',
      endDateKey: '2026-08-22',
      startMinute: 8 * 60,
      endMinute: 18 * 60,
      label: 'Vacances',
    })
    expect(rows).toHaveLength(3)
    expect(rows.map(row => row.startsAt.toISOString())).toEqual([
      '2026-08-20T06:00:00.000Z',
      '2026-08-21T06:00:00.000Z',
      '2026-08-22T06:00:00.000Z',
    ])
    expect(rows.map(row => row.endsAt.toISOString())).toEqual([
      '2026-08-20T16:00:00.000Z',
      '2026-08-21T16:00:00.000Z',
      '2026-08-22T16:00:00.000Z',
    ])
    expect(rows.every(row => row.type === 'UNAVAILABLE')).toBe(true)
    expect(rows.every(row => row.label === 'Vacances')).toBe(true)
  })

  it('produces a single row when start and end date are the same', () => {
    const rows = buildAvailabilityExceptionRows({
      type: 'AVAILABLE',
      startDateKey: '2026-08-20',
      endDateKey: '2026-08-20',
      startMinute: 8 * 60,
      endMinute: 12 * 60,
      label: null,
    })
    expect(rows).toHaveLength(1)
  })

  it('uses the next local midnight for a full day across DST', () => {
    const rows = buildAvailabilityExceptionRows({
      type: 'UNAVAILABLE',
      startDateKey: '2026-10-25',
      endDateKey: '2026-10-25',
      startMinute: 0,
      endMinute: 24 * 60,
      label: 'Journée entière',
    })
    expect(rows[0]?.startsAt.toISOString()).toBe('2026-10-24T22:00:00.000Z')
    expect(rows[0]?.endsAt.toISOString()).toBe('2026-10-25T23:00:00.000Z')
  })

  it('rejects an end date before the start date', () => {
    expect(() =>
      buildAvailabilityExceptionRows({
        type: 'UNAVAILABLE',
        startDateKey: '2026-08-22',
        endDateKey: '2026-08-20',
        startMinute: 8 * 60,
        endMinute: 18 * 60,
        label: null,
      }),
    ).toThrow()
  })
})

describe('manual admin appointments', () => {
  const startsAt = new Date('2099-08-10T12:00:00.000Z')
  const created = {
    id: 'appointment-admin',
    serviceId: 'service',
    serviceNameSnapshot: 'Soin',
    startsAt,
    source: 'ADMIN',
    status: 'CONFIRMED',
    allowsOverlap: false,
  }

  const buildTransaction = (
    conflict: { id: string; startsAt: Date } | null = null,
  ) => ({
    appointment: {
      findFirst: vi.fn().mockResolvedValue(conflict),
      create: vi
        .fn()
        .mockImplementation(async ({ data }) => ({ ...created, ...data })),
    },
    service: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'service',
        name: 'Soin',
        priceCents: 10_000,
        durationMinutes: 60,
        preparationMinutes: 0,
        cleanupMinutes: 0,
        isArchived: false,
      }),
    },
    appointmentActivity: { create: vi.fn() },
    customer: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'customer-manual' }),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-event' }) },
  })

  const asDatabase = (transaction: ReturnType<typeof buildTransaction>) =>
    ({
      $transaction: vi.fn(async callback => callback(transaction)),
    }) as unknown as PrismaClient

  const input = {
    serviceId: 'service',
    startsAt,
    firstName: 'Arzu',
    lastName: 'Test',
    email: 'arzu@example.com',
    phone: '+41791234567',
    comment: null,
  }

  it('does not create a customer activity', async () => {
    const transaction = buildTransaction()

    const result = await saveAdminAppointmentSerializable(
      asDatabase(transaction),
      input,
    )

    // Une création ne rapporte aucun état précédent : c'est ce `null` qui
    // dit à l'action d'envoyer une confirmation plutôt qu'un déplacement.
    expect(result.previous).toBeNull()
    expect(result.appointment.id).toBe('appointment-admin')
    expect(transaction.appointmentActivity.create).not.toHaveBeenCalled()
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'ADMIN',
        actorId: 'admin',
        entityType: 'APPOINTMENT',
        entityId: created.id,
        action: 'CREATED',
      }),
    })
  })

  it('refuse une superposition non confirmée, en nommant l’heure occupée', async () => {
    const transaction = buildTransaction({
      id: 'appointment-existant',
      startsAt: new Date('2099-08-10T12:00:00.000Z'),
    })

    await expect(
      saveAdminAppointmentSerializable(asDatabase(transaction), input),
    ).rejects.toMatchObject({ code: 'OVERLAP', conflictTime: '14:00' })
    expect(transaction.appointment.create).not.toHaveBeenCalled()
  })

  it('marque le rendez-vous quand Arzu confirme la superposition', async () => {
    const transaction = buildTransaction({
      id: 'appointment-existant',
      startsAt: new Date('2099-08-10T12:00:00.000Z'),
    })

    await saveAdminAppointmentSerializable(asDatabase(transaction), {
      ...input,
      acknowledgeOverlap: true,
    })

    expect(transaction.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ allowsOverlap: true }),
    })
    // La marque se relit dans l'historique : c'est une décision, pas un
    // accident.
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        changes: expect.objectContaining({
          after: expect.objectContaining({ allowsOverlap: true }),
        }),
      }),
    })
  })

  it('n’écrit la marque que si une superposition existe vraiment', async () => {
    // Le drapeau vient du conflit constaté, pas de la case cochée : déplacer
    // le rendez-vous sur une heure libre le rend à la contrainte.
    const transaction = buildTransaction()

    await saveAdminAppointmentSerializable(asDatabase(transaction), {
      ...input,
      acknowledgeOverlap: true,
    })

    expect(transaction.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ allowsOverlap: false }),
    })
  })
})

describe('admin appointment series', () => {
  const seriesInput = {
    serviceId: 'service',
    date: '2026-08-10',
    minute: 10 * 60,
    occurrenceCount: 3,
    intervalWeeks: 1,
    firstName: 'Marie',
    lastName: 'Dupont',
    email: 'marie@example.com',
    phone: '+41791234567',
    comment: null,
  }

  const service = {
    id: 'service',
    name: 'Soin visage',
    priceCents: 12_000,
    durationMinutes: 60,
    preparationMinutes: 15,
    cleanupMinutes: 15,
    isArchived: false,
  }

  const weeklyRanges = [
    { dayOfWeek: 1, startMinute: 8 * 60, endMinute: 18 * 60 },
  ]

  it('keeps the local time across the daylight-saving change', () => {
    const starts = buildAdminAppointmentSeriesStarts({
      date: '2026-03-22',
      minute: 9 * 60,
      occurrenceCount: 2,
      intervalWeeks: 1,
    })
    expect(starts.map(start => start.toISOString())).toEqual([
      '2026-03-22T08:00:00.000Z',
      '2026-03-29T07:00:00.000Z',
    ])
  })

  it('rejects an unbounded series', () => {
    expect(() =>
      buildAdminAppointmentSeriesStarts({
        date: '2026-08-10',
        minute: 9 * 60,
        occurrenceCount: 25,
        intervalWeeks: 1,
      }),
    ).toThrow('INVALID_SERIES')
  })

  it('identifies the exact conflicting occurrence with buffers included', async () => {
    const database = {
      service: { findUnique: vi.fn().mockResolvedValue(service) },
      appointment: {
        findMany: vi.fn().mockResolvedValue([
          {
            startsAt: new Date('2026-08-17T08:30:00.000Z'),
            occupiedStartsAt: new Date('2026-08-17T08:15:00.000Z'),
            occupiedEndsAt: new Date('2026-08-17T09:45:00.000Z'),
          },
        ]),
      },
      weeklyAvailability: {
        findMany: vi.fn().mockResolvedValue(weeklyRanges),
      },
      availabilityException: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient

    const preview = await previewAdminAppointmentSeries(database, seriesInput)

    expect(preview.conflictCount).toBe(1)
    expect(preview.occurrences[1]).toMatchObject({
      index: 2,
      date: '2026-08-17',
      conflictTime: '10:30',
      occupiedStartsAtTime: '09:45',
      occupiedEndsAtTime: '11:15',
    })
    expect(preview.occurrences[0]?.conflictTime).toBeNull()
  })

  it('creates no row when one occurrence conflicts', async () => {
    const create = vi.fn()
    const transaction = {
      service: { findUnique: vi.fn().mockResolvedValue(service) },
      appointment: {
        findMany: vi.fn().mockResolvedValue([
          {
            startsAt: new Date('2026-08-17T08:30:00.000Z'),
            occupiedStartsAt: new Date('2026-08-17T08:15:00.000Z'),
            occupiedEndsAt: new Date('2026-08-17T09:45:00.000Z'),
          },
        ]),
        create,
      },
      weeklyAvailability: {
        findMany: vi.fn().mockResolvedValue(weeklyRanges),
      },
      availabilityException: { findMany: vi.fn().mockResolvedValue([]) },
    }
    const database = {
      $transaction: vi.fn(callback => callback(transaction)),
    } as unknown as PrismaClient

    await expect(
      createAdminAppointmentSeriesSerializable(database, seriesInput),
    ).rejects.toBeInstanceOf(AdminAppointmentSeriesError)
    expect(create).not.toHaveBeenCalled()
  })

  it('creates and audits every occurrence in one transaction', async () => {
    const create = vi.fn().mockImplementation(({ data }) => ({
      ...data,
      id: `appointment-${data.startsAt.toISOString()}`,
    }))
    const transaction = {
      service: { findUnique: vi.fn().mockResolvedValue(service) },
      appointment: { findMany: vi.fn().mockResolvedValue([]), create },
      weeklyAvailability: {
        findMany: vi.fn().mockResolvedValue(weeklyRanges),
      },
      availabilityException: { findMany: vi.fn().mockResolvedValue([]) },
      customer: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: 'customer-series' }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit' }) },
    }
    const database = {
      $transaction: vi.fn(callback => callback(transaction)),
    } as unknown as PrismaClient

    const created = await createAdminAppointmentSeriesSerializable(
      database,
      seriesInput,
    )

    expect(created).toHaveLength(3)
    expect(create).toHaveBeenCalledTimes(3)
    // Une seule fiche pour toute la série, rattachée à chaque occurrence.
    expect(transaction.customer.upsert).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customerId: 'customer-series' }),
      }),
    )
    // Trois rendez-vous, plus la fiche créée au passage.
    expect(transaction.auditEvent.create).toHaveBeenCalledTimes(4)
    expect(database.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
  })
})
