import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  hasSameOrigin: vi.fn(),
  saveAppointment: vi.fn(),
  cancelAppointment: vi.fn(),
  insideHours: vi.fn(),
  revalidatePath: vi.fn(),
  notifyConfirmed: vi.fn(),
  notifyRescheduled: vi.fn(),
  notifyCancelled: vi.fn(),
}))

vi.mock('@/lib/core/session-cookies', () => ({
  getAdminSession: mocks.getAdminSession,
}))
vi.mock('@/lib/utils/request', () => ({ hasSameOrigin: mocks.hasSameOrigin }))
vi.mock('@/lib/core/prisma', () => ({ default: { marker: 'prisma' } }))
vi.mock('@/lib/admin/agenda', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/admin/agenda')>()
  return {
    ...original,
    saveAdminAppointmentSerializable: mocks.saveAppointment,
    cancelAdminAppointmentSerializable: mocks.cancelAppointment,
    isAdminAppointmentInsidePublicHours: mocks.insideHours,
  }
})
vi.mock('@/lib/email/notifications', () => ({
  notifyAppointmentConfirmed: mocks.notifyConfirmed,
  notifyAppointmentRescheduled: mocks.notifyRescheduled,
  notifyAppointmentCancelled: mocks.notifyCancelled,
  notifyAppointmentSeriesConfirmed: vi.fn(),
}))
vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: vi.fn(),
}))

import {
  cancelAdminAppointment,
  saveAdminAppointment,
} from '@/lib/actions/admin-agenda'

const startsAt = new Date('2026-09-14T08:00:00.000Z')

const validInput = {
  appointmentId: 'appointment-1',
  serviceId: 'service-1',
  date: '2026-09-14',
  time: '10:00',
  lastName: 'Meyer',
  email: 'claire@example.ch',
  phone: '+41791234567',
}

const savedAppointment = {
  id: 'appointment-1',
  serviceId: 'service-1',
  startsAt,
  endsAt: new Date('2026-09-14T08:30:00.000Z'),
  customerEmail: 'claire@example.ch',
  customerFirstName: 'Claire',
  customerLastName: 'Meyer',
  serviceNameSnapshot: 'Épilation',
  servicePriceCents: 3500,
}

describe('saveAdminAppointment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAdminSession.mockResolvedValue({ kind: 'admin' })
    mocks.hasSameOrigin.mockResolvedValue(true)
    mocks.insideHours.mockResolvedValue(true)
    mocks.notifyConfirmed.mockReturnValue('claire@example.ch')
    mocks.notifyRescheduled.mockReturnValue('claire@example.ch')
  })

  it('refuse d’enregistrer un rendez-vous sans adresse e-mail', async () => {
    // C'est l'adresse qui rattache le rendez-vous à une fiche et qui permet de
    // prévenir la personne : sans elle, rien n'est enregistré.
    const result = await saveAdminAppointment({ ...validInput, email: '' })

    expect(result.ok).toBe(false)
    expect(result.message).toContain('Indiquez l’e-mail et le téléphone')
    expect(mocks.saveAppointment).not.toHaveBeenCalled()
  })

  it('prévient la personne quand l’horaire change', async () => {
    mocks.saveAppointment.mockResolvedValue({
      appointment: savedAppointment,
      previous: {
        startsAt: new Date('2026-09-13T08:00:00.000Z'),
        serviceId: 'service-1',
      },
    })

    const result = await saveAdminAppointment(validInput)

    expect(result.ok).toBe(true)
    expect(mocks.notifyRescheduled).toHaveBeenCalledTimes(1)
    expect(result.message).toContain('claire@example.ch a été prévenu')
  })

  it('n’écrit à personne pour une correction sans effet sur le rendez-vous', async () => {
    mocks.saveAppointment.mockResolvedValue({
      appointment: savedAppointment,
      previous: { startsAt, serviceId: 'service-1' },
    })

    const result = await saveAdminAppointment(validInput)

    expect(result.ok).toBe(true)
    expect(mocks.notifyRescheduled).not.toHaveBeenCalled()
    expect(mocks.notifyConfirmed).not.toHaveBeenCalled()
    expect(result.message).toBe('Le rendez-vous a été mis à jour.')
  })
})

describe('cancelAdminAppointment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAdminSession.mockResolvedValue({ kind: 'admin' })
    mocks.hasSameOrigin.mockResolvedValue(true)
    mocks.cancelAppointment.mockResolvedValue(savedAppointment)
  })

  it('annonce clairement que personne n’a été prévenu, faute d’adresse', async () => {
    mocks.notifyCancelled.mockReturnValue(null)

    const result = await cancelAdminAppointment('appointment-1')

    expect(result.ok).toBe(true)
    expect(result.message).toContain('Personne n’a été prévenu')
  })
})
