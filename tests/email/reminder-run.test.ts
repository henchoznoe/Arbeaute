import { beforeEach, describe, expect, it, vi } from 'vitest'

const database = vi.hoisted(() => ({
  appointment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  emailDelivery: {
    createMany: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))
const deliverClaimedEmail = vi.hoisted(() => vi.fn())

vi.mock('@/lib/core/env', () => ({ isEmailConfigured: true }))
vi.mock('@/lib/core/prisma', () => ({ default: database }))
vi.mock('@/lib/email/send', () => ({ deliverClaimedEmail }))

const { runAppointmentReminders } = await import('@/lib/email/reminder-run')

const now = new Date('2026-08-22T05:30:00.000Z')
const appointment = {
  id: 'apt-1',
  startsAt: new Date('2026-08-23T12:00:00.000Z'),
  endsAt: new Date('2026-08-23T13:00:00.000Z'),
  customerEmail: 'marie@example.ch',
  customerFirstName: 'Marie',
  customerLastName: 'Dupont',
  serviceNameSnapshot: 'Soin visage bio',
  servicePriceCents: 12_000,
  service: { category: { name: 'Soins visage' } },
}

describe('runAppointmentReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    database.appointment.findMany.mockResolvedValue([appointment])
    database.appointment.count.mockResolvedValue(0)
    database.appointment.findUnique.mockResolvedValue({
      ...appointment,
      status: 'CONFIRMED',
    })
    database.emailDelivery.createMany.mockResolvedValue({ count: 1 })
    database.emailDelivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      status: 'PENDING',
      attempts: 1,
      updatedAt: now,
    })
    database.emailDelivery.update.mockResolvedValue({ id: 'delivery-1' })
    database.emailDelivery.delete.mockResolvedValue({ id: 'delivery-1' })
    deliverClaimedEmail.mockResolvedValue('sent')
  })

  it('envoie le rendez-vous de demain avec une clé liée à son horaire', async () => {
    await expect(runAppointmentReminders(now)).resolves.toEqual({
      throughDateKey: '2026-08-23',
      sent: 1,
      failed: 0,
      skipped: 0,
      withoutEmail: 0,
    })

    expect(database.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startsAt: {
            gte: new Date('2026-08-22T07:30:00.000Z'),
            lt: new Date('2026-08-23T22:00:00.000Z'),
          },
        }),
      }),
    )
    expect(deliverClaimedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryId: 'delivery-1',
        idempotencyKey: 'appointment-reminder/apt-1/2026-08-23T12:00:00.000Z',
        to: 'marie@example.ch',
      }),
    )
  })

  it('ignore une clé déjà envoyée', async () => {
    database.emailDelivery.createMany.mockResolvedValue({ count: 0 })
    database.emailDelivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      status: 'SENT',
      attempts: 1,
      updatedAt: now,
    })

    await expect(runAppointmentReminders(now)).resolves.toMatchObject({
      sent: 0,
      skipped: 1,
    })
    expect(deliverClaimedEmail).not.toHaveBeenCalled()
  })

  it('réclame atomiquement la seconde et dernière tentative', async () => {
    database.emailDelivery.createMany.mockResolvedValue({ count: 0 })
    database.emailDelivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      status: 'FAILED',
      attempts: 1,
      updatedAt: new Date('2026-08-21T05:30:00.000Z'),
    })
    database.emailDelivery.updateMany.mockResolvedValue({ count: 1 })

    await expect(runAppointmentReminders(now)).resolves.toMatchObject({
      sent: 1,
      skipped: 0,
    })
    expect(database.emailDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'FAILED', attempts: 1 }),
        data: expect.objectContaining({ attempts: { increment: 1 } }),
      }),
    )
  })

  it('abandonne la ligne réclamée si le rendez-vous vient d’être annulé', async () => {
    database.appointment.findUnique.mockResolvedValue({
      ...appointment,
      status: 'CANCELLED',
    })

    await expect(runAppointmentReminders(now)).resolves.toMatchObject({
      sent: 0,
      skipped: 1,
    })
    expect(database.emailDelivery.delete).toHaveBeenCalledWith({
      where: { id: 'delivery-1' },
    })
    expect(deliverClaimedEmail).not.toHaveBeenCalled()
  })

  it('compte les anciens rendez-vous sans adresse sans créer de faux échec', async () => {
    database.appointment.findMany.mockResolvedValue([])
    database.appointment.count.mockResolvedValue(2)

    await expect(runAppointmentReminders(now)).resolves.toMatchObject({
      sent: 0,
      failed: 0,
      withoutEmail: 2,
    })
    expect(database.emailDelivery.createMany).not.toHaveBeenCalled()
  })
})
