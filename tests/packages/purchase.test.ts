import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

const mocks = vi.hoisted(() => ({
  getAvailableSlots: vi.fn(),
  getBookingSettings: vi.fn(),
  upsertCustomerIdentity: vi.fn(),
}))

vi.mock('@/lib/reservation/availability', () => ({
  getAvailableSlots: mocks.getAvailableSlots,
}))
vi.mock('@/lib/reservation/booking-settings', () => ({
  getBookingSettings: mocks.getBookingSettings,
}))
vi.mock('@/lib/reservation/customers', () => ({
  normalizeCustomerSearchName: vi.fn(() => 'marie dupont'),
  upsertCustomerIdentity: mocks.upsertCustomerIdentity,
}))

import {
  PackagePurchaseError,
  purchasePackageWithFirstAppointment,
} from '@/lib/packages/purchase'

const startsAt = new Date('2099-09-18T12:00:00.000Z')
const service = {
  id: 'service-1',
  name: 'Visage',
  priceCents: 20000,
  durationMinutes: 60,
  preparationMinutes: 10,
  cleanupMinutes: 5,
  isBookable: true,
  isVisible: true,
  isArchived: false,
  category: { name: 'Épilation laser' },
}
const offeredPackage = {
  id: 'package-1',
  name: 'Forfait laser',
  priceCents: 160000,
  sessionCount: 8,
  validityMonths: 12,
  services: [{ serviceId: service.id, service }],
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
  endsAt: new Date('2099-09-18T13:00:00.000Z'),
  occupiedStartsAt: new Date('2099-09-18T11:50:00.000Z'),
  occupiedEndsAt: new Date('2099-09-18T13:05:00.000Z'),
  customerFirstName: 'Marie',
  customerLastName: 'Dupont',
  customerEmail: 'marie@example.com',
  customerPhone: '+41791234567',
  comment: null,
  source: 'PUBLIC' as const,
  status: 'CONFIRMED' as const,
  cancelledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const makeDatabase = () => {
  const transaction = {
    package: { findFirst: vi.fn().mockResolvedValue(offeredPackage) },
    appointment: { create: vi.fn().mockResolvedValue(appointment) },
    customerPackage: {
      create: vi.fn().mockResolvedValue({
        id: 'customer-package-1',
        packageNameSnapshot: offeredPackage.name,
        packagePriceCents: offeredPackage.priceCents,
        sessionCountSnapshot: offeredPackage.sessionCount,
        validityMonthsSnapshot: offeredPackage.validityMonths,
        installmentCount: 3,
      }),
    },
    packageSession: { create: vi.fn().mockResolvedValue({ id: 'session-1' }) },
    appointmentActivity: {
      create: vi.fn().mockResolvedValue({ id: 'event-1' }),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
  }
  const database = {
    $transaction: vi.fn(callback => callback(transaction)),
  } as unknown as PrismaClient
  return { database, transaction }
}

const input = {
  packageId: offeredPackage.id,
  serviceId: service.id,
  startsAt,
  installmentCount: 3 as const,
  firstName: 'Marie',
  lastName: 'Dupont',
  email: 'marie@example.com',
  phone: '+41791234567',
  comment: null,
}

describe('purchasePackageWithFirstAppointment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getBookingSettings.mockResolvedValue({})
    mocks.getAvailableSlots.mockResolvedValue([
      { startsAt: startsAt.toISOString(), state: 'OPEN', label: '14:00' },
    ])
    mocks.upsertCustomerIdentity.mockResolvedValue({
      id: 'customer-1',
      identityVersion: 1,
    })
  })

  it('creates the sale, its immutable copy and first appointment atomically', async () => {
    const { database, transaction } = makeDatabase()

    await purchasePackageWithFirstAppointment(database, input)

    expect(database.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
    expect(transaction.customerPackage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        packageNameSnapshot: offeredPackage.name,
        packagePriceCents: offeredPackage.priceCents,
        sessionCountSnapshot: offeredPackage.sessionCount,
        validityMonthsSnapshot: offeredPackage.validityMonths,
        installmentCount: 3,
        revenueAppointmentId: appointment.id,
        allowedServices: {
          create: [{ serviceId: service.id }],
        },
      }),
    })
    expect(transaction.packageSession.create).toHaveBeenCalledWith({
      data: {
        customerPackageId: 'customer-package-1',
        appointmentId: appointment.id,
      },
    })
  })

  it('refuses a care that is not included', async () => {
    const { database } = makeDatabase()

    await expect(
      purchasePackageWithFirstAppointment(database, {
        ...input,
        serviceId: 'service-not-allowed',
      }),
    ).rejects.toEqual(new PackagePurchaseError('SERVICE_NOT_ALLOWED'))
  })

  it('refuses last-minute request slots', async () => {
    const { database } = makeDatabase()
    mocks.getAvailableSlots.mockResolvedValue([
      { startsAt: startsAt.toISOString(), state: 'ON_REQUEST', label: '14:00' },
    ])

    await expect(
      purchasePackageWithFirstAppointment(database, input),
    ).rejects.toEqual(new PackagePurchaseError('SLOT_UNAVAILABLE'))
  })

  it('refuses a hidden or archived offer', async () => {
    const { database, transaction } = makeDatabase()
    transaction.package.findFirst.mockResolvedValue(null)

    await expect(
      purchasePackageWithFirstAppointment(database, input),
    ).rejects.toEqual(new PackagePurchaseError('PACKAGE_UNAVAILABLE'))
  })
})
