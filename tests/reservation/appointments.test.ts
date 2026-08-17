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

import {
  cancelAppointmentSerializable,
  createAppointmentSerializable,
  moveAppointmentSerializable,
  ReservationError,
} from '@/lib/reservation/appointments'

const startsAt = new Date('2099-08-10T12:00:00.000Z')
const movedStartsAt = new Date('2099-08-11T13:00:00.000Z')
const service = {
  id: 'service-1',
  name: 'Soin du visage',
  priceCents: 12_000,
  durationMinutes: 60,
  preparationMinutes: 15,
  cleanupMinutes: 10,
}
const appointment = {
  id: 'appointment-1',
  serviceId: service.id,
  customerId: 'customer-1',
  serviceNameSnapshot: service.name,
  servicePriceCents: service.priceCents,
  serviceDurationMinutes: service.durationMinutes,
  preparationMinutes: service.preparationMinutes,
  cleanupMinutes: service.cleanupMinutes,
  startsAt,
  endsAt: new Date('2099-08-10T13:00:00.000Z'),
  occupiedStartsAt: new Date('2099-08-10T11:45:00.000Z'),
  occupiedEndsAt: new Date('2099-08-10T13:10:00.000Z'),
  customerFirstName: 'Marie',
  customerLastName: 'Dupont',
  customerEmail: 'marie@example.com',
  customerPhone: '+41791234567',
  comment: null,
  source: 'PUBLIC' as const,
  status: 'CONFIRMED' as const,
  cancelledAt: null,
  createdAt: new Date('2099-08-01T10:00:00.000Z'),
  updatedAt: new Date('2099-08-01T10:00:00.000Z'),
}

const makeDatabase = () => {
  const transaction = {
    service: { findFirst: vi.fn().mockResolvedValue(service) },
    customer: {
      findFirst: vi.fn().mockResolvedValue({ id: 'customer-1' }),
      create: vi.fn().mockResolvedValue({
        id: 'customer-1',
        emailNormalized: 'marie@example.com',
        phoneNormalized: '+41791234567',
        createdAt: new Date('2099-08-01T10:00:00.000Z'),
        updatedAt: new Date('2099-08-01T11:00:00.000Z'),
      }),
      update: vi.fn().mockResolvedValue({
        id: 'customer-1',
        emailNormalized: 'marie@example.com',
        phoneNormalized: '+41791234567',
        createdAt: new Date('2099-08-01T10:00:00.000Z'),
        updatedAt: new Date('2099-08-01T11:00:00.000Z'),
      }),
    },
    appointment: {
      create: vi.fn().mockResolvedValue(appointment),
      findFirst: vi.fn().mockResolvedValue(appointment),
      update: vi.fn(),
    },
    appointmentActivity: { create: vi.fn().mockResolvedValue({ id: 'event' }) },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-event' }) },
  }
  const database = {
    $transaction: vi.fn(async callback => callback(transaction)),
  } as unknown as PrismaClient
  return { database, transaction }
}

describe('customer appointment activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getBookingSettings.mockResolvedValue({
      minBookingNoticeHours: 12,
      bookingHorizonMonths: 3,
      customerChangeCutoffHours: 48,
      slotIntervalMinutes: 15,
    })
    mocks.getAvailableSlots.mockResolvedValue([
      { startsAt: startsAt.toISOString(), label: '14:00' },
    ])
  })

  it('records a booking in the same transaction', async () => {
    const { database, transaction } = makeDatabase()

    await createAppointmentSerializable(database, {
      serviceId: service.id,
      startsAt,
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie@example.com',
      phone: '+41791234567',
      comment: null,
    })

    expect(transaction.appointmentActivity.create).toHaveBeenCalledWith({
      data: {
        type: 'CREATED',
        appointmentId: appointment.id,
        customerFirstNameSnapshot: 'Marie',
        customerLastNameSnapshot: 'Dupont',
        serviceNameSnapshot: service.name,
        appointmentStartsAt: startsAt,
      },
    })
    expect(transaction.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'customer-1',
        customerFirstName: 'Marie',
        customerLastName: 'Dupont',
        customerEmail: 'marie@example.com',
        customerPhone: '+41791234567',
      }),
    })
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'CUSTOMER',
        actorId: 'customer-1',
        entityType: 'APPOINTMENT',
        entityId: appointment.id,
        action: 'CREATED',
      }),
    })
  })

  it('records both slots when a customer moves an appointment', async () => {
    const { database, transaction } = makeDatabase()
    const moved = {
      ...appointment,
      startsAt: movedStartsAt,
      endsAt: new Date('2099-08-11T14:00:00.000Z'),
    }
    transaction.appointment.update.mockResolvedValue(moved)
    mocks.getAvailableSlots.mockResolvedValue([
      { startsAt: movedStartsAt.toISOString(), label: '15:00' },
    ])

    await moveAppointmentSerializable(database, {
      appointmentId: appointment.id,
      startsAt: movedStartsAt,
      customerId: 'customer-1',
      now: new Date('2099-08-01T10:00:00.000Z'),
    })

    expect(transaction.appointment.findFirst).toHaveBeenCalledWith({
      where: {
        id: appointment.id,
        customerId: 'customer-1',
        status: 'CONFIRMED',
      },
    })
    expect(transaction.appointmentActivity.create).toHaveBeenCalledWith({
      data: {
        type: 'RESCHEDULED',
        appointmentId: appointment.id,
        customerFirstNameSnapshot: 'Marie',
        customerLastNameSnapshot: 'Dupont',
        serviceNameSnapshot: service.name,
        appointmentStartsAt: movedStartsAt,
        previousAppointmentStartsAt: startsAt,
      },
    })
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'CUSTOMER',
        entityId: appointment.id,
        action: 'RESCHEDULED',
      }),
    })
  })

  it('records a customer cancellation', async () => {
    const { database, transaction } = makeDatabase()
    transaction.appointment.update.mockResolvedValue({
      ...appointment,
      status: 'CANCELLED',
      cancelledAt: new Date('2099-08-01T10:00:00.000Z'),
    })

    await cancelAppointmentSerializable(
      database,
      appointment.id,
      'customer-1',
      new Date('2099-08-01T10:00:00.000Z'),
    )

    expect(transaction.appointmentActivity.create).toHaveBeenCalledWith({
      data: {
        type: 'CANCELLED',
        appointmentId: appointment.id,
        customerFirstNameSnapshot: 'Marie',
        customerLastNameSnapshot: 'Dupont',
        serviceNameSnapshot: service.name,
        appointmentStartsAt: startsAt,
      },
    })
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'CUSTOMER',
        entityId: appointment.id,
        action: 'CANCELLED',
      }),
    })
  })

  it('does not record an activity when the slot is unavailable', async () => {
    const { database, transaction } = makeDatabase()
    mocks.getAvailableSlots.mockResolvedValue([])

    await expect(
      createAppointmentSerializable(database, {
        serviceId: service.id,
        startsAt,
        firstName: 'Marie',
        lastName: 'Dupont',
        email: 'marie@example.com',
        phone: '+41791234567',
        comment: null,
      }),
    ).rejects.toEqual(new ReservationError('SLOT_UNAVAILABLE'))
    expect(transaction.appointment.create).not.toHaveBeenCalled()
    expect(transaction.appointmentActivity.create).not.toHaveBeenCalled()
    expect(transaction.auditEvent.create).not.toHaveBeenCalled()
  })
})
