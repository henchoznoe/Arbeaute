import { describe, expect, it, vi } from 'vitest'
import {
  bookingSettingsSchema,
  saveBookingSettingsAudited,
} from '@/lib/admin/booking-settings'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

const settings = {
  minBookingNoticeHours: 12,
  bookingHorizonMonths: 3,
  slotIntervalMinutes: 15,
  lateRequestsEnabled: false,
  lateRequestFloorHours: 2,
}

describe('booking settings', () => {
  it('accepts the historical defaults and rejects dangerous combinations', () => {
    expect(bookingSettingsSchema.safeParse(settings).success).toBe(true)
    expect(
      bookingSettingsSchema.safeParse({
        ...settings,
        bookingHorizonMonths: 1,
        minBookingNoticeHours: 700,
      }).success,
    ).toBe(false)
    expect(
      bookingSettingsSchema.safeParse({
        ...settings,
        slotIntervalMinutes: 7,
      }).success,
    ).toBe(false)
  })

  // Une case décochée ne poste rien : sans traitement, le champ manquant
  // ferait échouer l'enregistrement de toute la page.
  it('lit la case des demandes de dernière minute à partir de ce que poste le navigateur', () => {
    const { lateRequestsEnabled, ...withoutCheckbox } = settings
    expect(lateRequestsEnabled).toBe(false)

    expect(bookingSettingsSchema.safeParse(withoutCheckbox)).toMatchObject({
      success: true,
      data: { lateRequestsEnabled: false },
    })
    expect(
      bookingSettingsSchema.safeParse({
        ...withoutCheckbox,
        lateRequestsEnabled: 'on',
      }),
    ).toMatchObject({ success: true, data: { lateRequestsEnabled: true } })
  })

  it('updates the singleton and its audit event in the same transaction', async () => {
    const previous = {
      id: 'default',
      ...settings,
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
      updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    }
    const updated = { ...previous, slotIntervalMinutes: 30 }
    const transaction = {
      bookingSettings: {
        findUnique: vi.fn().mockResolvedValue(previous),
        upsert: vi.fn().mockResolvedValue(updated),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit' }) },
    }
    const database = {
      $transaction: vi.fn(async callback => callback(transaction)),
    } as unknown as PrismaClient

    await expect(
      saveBookingSettingsAudited(database, {
        ...settings,
        slotIntervalMinutes: 30,
      }),
    ).resolves.toBe(updated)
    expect(transaction.bookingSettings.upsert).toHaveBeenCalledWith({
      where: { id: 'default' },
      create: { id: 'default', ...settings, slotIntervalMinutes: 30 },
      update: { ...settings, slotIntervalMinutes: 30 },
    })
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'UPDATED',
        entityType: 'BOOKING_SETTINGS',
        entityId: 'default',
      }),
    })
  })
})
