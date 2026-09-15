import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  bookPackageSession: vi.fn(),
  customerFindFirst: vi.fn(),
  findCustomerForSession: vi.fn(),
  getCustomerSession: vi.fn(),
  hasSameOrigin: vi.fn(),
  notifyAppointmentConfirmed: vi.fn(),
  purchasePackage: vi.fn(),
  revalidatePath: vi.fn(),
  setCustomerSession: vi.fn(),
}))

vi.mock('@vercel/blob', () => ({ del: vi.fn() }))
vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: vi.fn(),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/core/prisma', () => ({
  default: { customer: { findFirst: mocks.customerFindFirst } },
}))
vi.mock('@/lib/core/session-cookies', () => ({
  getAdminSession: vi.fn(),
  getCustomerSession: mocks.getCustomerSession,
  setCustomerSession: mocks.setCustomerSession,
}))
vi.mock('@/lib/email/notifications', () => ({
  notifyAppointmentConfirmed: mocks.notifyAppointmentConfirmed,
}))
vi.mock('@/lib/packages/purchase', async importOriginal => {
  const original =
    await importOriginal<typeof import('@/lib/packages/purchase')>()
  return {
    ...original,
    bookCustomerPackageSession: mocks.bookPackageSession,
    purchasePackageWithFirstAppointment: mocks.purchasePackage,
  }
})
vi.mock('@/lib/reservation/customers', async importOriginal => {
  const original =
    await importOriginal<typeof import('@/lib/reservation/customers')>()
  return {
    ...original,
    findCustomerForSession: mocks.findCustomerForSession,
  }
})
vi.mock('@/lib/services/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))
vi.mock('@/lib/utils/request', () => ({
  getRequestIp: vi.fn().mockResolvedValue('203.0.113.1'),
  hasSameOrigin: mocks.hasSameOrigin,
}))

import {
  createPublicCustomerPackageSession,
  createPublicPackageBooking,
} from '@/lib/actions/packages'

const startsAt = new Date('2099-09-18T12:00:00.000Z')

describe('réservation publique d’un forfait', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasSameOrigin.mockResolvedValue(true)
    mocks.checkRateLimit.mockResolvedValue({ allowed: true })
    mocks.getCustomerSession.mockResolvedValue({
      subject: 'customer-1',
      identityVersion: 1,
    })
    mocks.findCustomerForSession.mockResolvedValue({
      id: 'customer-1',
      identityVersion: 1,
    })
    mocks.customerFindFirst.mockResolvedValue({
      firstName: 'Noé',
      lastName: 'Henchoz',
      phone: '+41791234567',
    })
    mocks.purchasePackage.mockResolvedValue({
      customer: { id: 'customer-1', identityVersion: 1 },
      customerPackage: {
        packageNameSnapshot: 'Forfait laser',
        packagePriceCents: 160_000,
        sessionCountSnapshot: 8,
        installmentCount: 2,
        sessions: [],
      },
      appointment: {
        id: 'appointment-1',
        serviceNameSnapshot: 'Aisselles',
        categoryName: 'Épilation laser',
        startsAt,
        endsAt: new Date('2099-09-18T12:30:00.000Z'),
      },
    })
    mocks.notifyAppointmentConfirmed.mockReturnValue('henchoznoe@gmail.com')
    mocks.bookPackageSession.mockResolvedValue({
      customer: { id: 'customer-1', identityVersion: 1 },
      customerPackage: {
        id: 'customer-package-1',
        packageNameSnapshot: 'Forfait laser',
        packagePriceCents: 160_000,
        sessionCountSnapshot: 8,
        installmentCount: 2,
        sessions: [],
      },
      appointment: {
        id: 'appointment-2',
        serviceNameSnapshot: 'Aisselles',
        categoryName: 'Épilation laser',
        customerEmail: 'henchoznoe@gmail.com',
        customerFirstName: 'Noé',
        customerLastName: 'Henchoz',
        servicePriceCents: 20000,
        startsAt,
        endsAt: new Date('2099-09-18T12:30:00.000Z'),
      },
    })
  })

  it('réutilise les coordonnées existantes quand les champs masqués valent null', async () => {
    const result = await createPublicPackageBooking({
      packageId: 'package-1',
      serviceId: 'service-1',
      startsAt: startsAt.toISOString(),
      installmentCount: 2,
      firstName: null,
      lastName: null,
      email: 'henchoznoe@gmail.com',
      phone: null,
      comment: '',
      consent: true,
      website: '',
    })

    expect(result.ok).toBe(true)
    expect(mocks.purchasePackage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        firstName: 'Noé',
        lastName: 'Henchoz',
        email: 'henchoznoe@gmail.com',
        phone: '+41791234567',
      }),
    )
    expect(mocks.setCustomerSession).toHaveBeenCalledWith('customer-1', 1)
  })

  it('réserve une séance restante avec la session du client', async () => {
    const result = await createPublicCustomerPackageSession({
      customerPackageId: 'customer-package-1',
      serviceId: 'service-1',
      startsAt: startsAt.toISOString(),
      comment: '',
      consent: true,
      website: '',
    })

    expect(result.ok).toBe(true)
    expect(result.appointment?.priceLabel).toBe('Inclus dans le forfait')
    expect(mocks.bookPackageSession).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        customerPackageId: 'customer-package-1',
        customerId: 'customer-1',
        serviceId: 'service-1',
      }),
    )
  })

  it('ne permet pas de consommer un forfait sans session valide', async () => {
    mocks.getCustomerSession.mockResolvedValue(null)

    const result = await createPublicCustomerPackageSession({
      customerPackageId: 'customer-package-1',
      serviceId: 'service-1',
      startsAt: startsAt.toISOString(),
      comment: '',
      consent: true,
      website: '',
    })

    expect(result).toMatchObject({ ok: false, reason: 'INVALID_CUSTOMER' })
    expect(mocks.bookPackageSession).not.toHaveBeenCalled()
  })
})
