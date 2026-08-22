import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

const mocks = vi.hoisted(() => ({
  getAvailableSlots: vi.fn(),
  getBookingSettings: vi.fn(),
}))

vi.mock('@/lib/reservation/availability', () => ({
  getAvailableSlots: mocks.getAvailableSlots,
}))
vi.mock('@/lib/reservation/booking-settings', () => ({
  getBookingSettings: mocks.getBookingSettings,
}))
vi.mock('@/lib/core/prisma', () => ({ default: { marker: 'prisma' } }))

import {
  acceptLateRequestSerializable,
  createLateRequestSerializable,
  declineLateRequestSerializable,
  isLateRequestExpired,
  LateRequestError,
  withdrawLateRequestSerializable,
} from '@/lib/reservation/late-requests'

const requestedStartsAt = new Date('2099-08-10T12:00:00.000Z')

const service = {
  id: 'service-1',
  name: 'Soin du visage',
  priceCents: 12_000,
  durationMinutes: 60,
  preparationMinutes: 15,
  cleanupMinutes: 10,
}

const storedRequest = {
  id: 'request-1',
  serviceId: service.id,
  customerId: 'customer-1',
  requestedStartsAt,
  serviceNameSnapshot: service.name,
  servicePriceCents: service.priceCents,
  serviceDurationMinutes: service.durationMinutes,
  preparationMinutes: service.preparationMinutes,
  cleanupMinutes: service.cleanupMinutes,
  comment: null,
  status: 'PENDING' as const,
  decidedAt: null,
  declineReason: null,
  appointmentId: null,
  createdAt: new Date('2099-08-10T06:00:00.000Z'),
  service: { category: { name: 'Épilation laser' } },
}

const customerInput = {
  serviceId: service.id,
  requestedStartsAt,
  firstName: 'Marie',
  lastName: 'Dupont',
  email: 'marie@example.com',
  phone: '+41791234567',
  comment: null,
}

const makeDatabase = (overrides: { pendingCount?: number } = {}) => {
  const transaction = {
    service: { findFirst: vi.fn().mockResolvedValue(service) },
    customer: {
      findUnique: vi.fn().mockResolvedValue({ id: 'customer-1' }),
      upsert: vi.fn().mockResolvedValue({
        id: 'customer-1',
        identityVersion: 1,
        firstName: 'Marie',
        lastName: 'Dupont',
        email: 'marie@example.com',
        phone: '+41791234567',
      }),
    },
    appointmentRequest: {
      count: vi.fn().mockResolvedValue(overrides.pendingCount ?? 0),
      create: vi.fn().mockResolvedValue(storedRequest),
      findUnique: vi.fn().mockResolvedValue({
        ...storedRequest,
        customer: {
          id: 'customer-1',
          firstName: 'Marie',
          lastName: 'Dupont',
          email: 'marie@example.com',
          phone: '+41791234567',
        },
      }),
      update: vi.fn().mockResolvedValue({
        ...storedRequest,
        status: 'ACCEPTED',
      }),
    },
    appointment: {
      create: vi.fn().mockResolvedValue({
        id: 'appointment-1',
        customerFirstName: 'Marie',
        customerLastName: 'Dupont',
        serviceNameSnapshot: service.name,
        startsAt: requestedStartsAt,
        service: { category: { name: 'Épilation laser' } },
      }),
    },
    appointmentActivity: { create: vi.fn().mockResolvedValue({ id: 'act' }) },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit' }) },
  }
  const database = {
    $transaction: vi.fn(async callback => callback(transaction)),
  } as unknown as PrismaClient
  return { database, transaction }
}

describe('demandes de dernière minute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getBookingSettings.mockResolvedValue({
      minBookingNoticeHours: 12,
      bookingHorizonMonths: 3,
      slotIntervalMinutes: 15,
      lateRequestsEnabled: true,
      lateRequestFloorHours: 2,
    })
    mocks.getAvailableSlots.mockResolvedValue([
      {
        startsAt: requestedStartsAt.toISOString(),
        label: '14:00',
        state: 'ON_REQUEST',
      },
    ])
  })

  it('enregistre la demande et l’inscrit à l’historique', async () => {
    const { database, transaction } = makeDatabase()

    await expect(
      createLateRequestSerializable(database, customerInput),
    ).resolves.toMatchObject({ request: { id: 'request-1' } })
    expect(transaction.appointmentRequest.create).toHaveBeenCalled()
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'APPOINTMENT_REQUEST',
        action: 'CREATED',
      }),
    })
  })

  // Une heure ordinaire se réserve : ouvrir un second chemin d'écriture
  // contournerait les garanties du premier.
  it('refuse une heure qui se réserve normalement', async () => {
    const { database, transaction } = makeDatabase()
    mocks.getAvailableSlots.mockResolvedValue([
      {
        startsAt: requestedStartsAt.toISOString(),
        label: '14:00',
        state: 'OPEN',
      },
    ])

    await expect(
      createLateRequestSerializable(database, customerInput),
    ).rejects.toEqual(new LateRequestError('SLOT_NOT_ON_REQUEST'))
    expect(transaction.appointmentRequest.create).not.toHaveBeenCalled()
  })

  it('refuse une heure que le moteur ne propose plus du tout', async () => {
    const { database, transaction } = makeDatabase()
    mocks.getAvailableSlots.mockResolvedValue([])

    await expect(
      createLateRequestSerializable(database, customerInput),
    ).rejects.toEqual(new LateRequestError('SLOT_NOT_ON_REQUEST'))
    expect(transaction.appointmentRequest.create).not.toHaveBeenCalled()
  })

  it('refuse toute demande quand le réglage est éteint', async () => {
    const { database, transaction } = makeDatabase()
    mocks.getBookingSettings.mockResolvedValue({
      minBookingNoticeHours: 12,
      bookingHorizonMonths: 3,
      slotIntervalMinutes: 15,
      lateRequestsEnabled: false,
      lateRequestFloorHours: 2,
    })

    await expect(
      createLateRequestSerializable(database, customerInput),
    ).rejects.toEqual(new LateRequestError('REQUESTS_DISABLED'))
    expect(transaction.appointmentRequest.create).not.toHaveBeenCalled()
  })

  it('plafonne les demandes en attente d’une même personne', async () => {
    const { database, transaction } = makeDatabase({ pendingCount: 2 })

    await expect(
      createLateRequestSerializable(database, customerInput),
    ).rejects.toEqual(new LateRequestError('TOO_MANY_PENDING'))
    expect(transaction.appointmentRequest.create).not.toHaveBeenCalled()
  })

  it('crée le rendez-vous à l’acceptation, avec ses bornes d’occupation', async () => {
    const { database, transaction } = makeDatabase()

    await acceptLateRequestSerializable(database, 'request-1')

    expect(transaction.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CONFIRMED',
          startsAt: requestedStartsAt,
          // Préparation et rangement élargissent l'intervalle protégé par la
          // contrainte d'exclusion : 15 min avant, 60 + 10 min après.
          occupiedStartsAt: new Date('2099-08-10T11:45:00.000Z'),
          occupiedEndsAt: new Date('2099-08-10T13:10:00.000Z'),
        }),
      }),
    )
    expect(transaction.appointmentActivity.create).toHaveBeenCalled()
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'ACCEPTED' }),
    })
  })

  it('n’accepte pas deux fois la même demande', async () => {
    const { database, transaction } = makeDatabase()
    transaction.appointmentRequest.findUnique.mockResolvedValue({
      ...storedRequest,
      status: 'ACCEPTED',
      customer: {
        id: 'customer-1',
        firstName: 'Marie',
        lastName: 'Dupont',
        email: 'marie@example.com',
        phone: '+41791234567',
      },
    })

    await expect(
      acceptLateRequestSerializable(database, 'request-1'),
    ).rejects.toEqual(new LateRequestError('ALREADY_DECIDED'))
    expect(transaction.appointment.create).not.toHaveBeenCalled()
  })

  it('traduit la contrainte d’exclusion en superposition', async () => {
    const { database, transaction } = makeDatabase()
    transaction.appointment.create.mockRejectedValue(
      new Error('appointment_no_confirmed_overlap'),
    )

    await expect(
      acceptLateRequestSerializable(database, 'request-1'),
    ).rejects.toEqual(new LateRequestError('OVERLAP'))
  })

  it('refuse sans créer de rendez-vous, et garde le motif', async () => {
    const { database, transaction } = makeDatabase()

    await declineLateRequestSerializable(database, 'request-1', 'Déjà prise')

    expect(transaction.appointment.create).not.toHaveBeenCalled()
    expect(transaction.appointmentRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DECLINED',
          declineReason: 'Déjà prise',
        }),
      }),
    )
  })

  // Le retrait vient du site : il ne doit pouvoir toucher que ses propres
  // demandes, jamais celles de quelqu'un d'autre.
  it('n’autorise pas le retrait de la demande d’une autre personne', async () => {
    const { database, transaction } = makeDatabase()

    await expect(
      withdrawLateRequestSerializable(database, 'request-1', 'customer-2'),
    ).rejects.toEqual(new LateRequestError('REQUEST_NOT_FOUND'))
    expect(transaction.appointmentRequest.update).not.toHaveBeenCalled()
  })

  it('retire une demande dont on est bien à l’origine', async () => {
    const { database, transaction } = makeDatabase()

    await withdrawLateRequestSerializable(database, 'request-1', 'customer-1')

    expect(transaction.appointmentRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'WITHDRAWN' }),
      }),
    )
  })
})

describe('péremption paresseuse', () => {
  const pending = { status: 'PENDING' as const, requestedStartsAt }

  it('tient pour dépassée une demande dont l’heure est passée', () => {
    expect(
      isLateRequestExpired(pending, new Date('2099-08-10T12:00:01.000Z')),
    ).toBe(true)
  })

  it('laisse en attente une demande encore à venir', () => {
    expect(
      isLateRequestExpired(pending, new Date('2099-08-10T11:59:00.000Z')),
    ).toBe(false)
  })

  it('ne périme jamais une demande déjà tranchée', () => {
    expect(
      isLateRequestExpired(
        { status: 'ACCEPTED', requestedStartsAt },
        new Date('2099-09-01T00:00:00.000Z'),
      ),
    ).toBe(false)
  })
})
