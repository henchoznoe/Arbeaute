import { z } from 'zod/v4'
import { writeAuditEvent } from '@/lib/admin/audit'
import { BOOKING_SETTINGS_ID } from '@/lib/reservation/booking-settings'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

export const SLOT_INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 60] as const

export const bookingSettingsSchema = z
  .object({
    minBookingNoticeHours: z.coerce.number().int().min(0).max(720),
    bookingHorizonMonths: z.coerce.number().int().min(1).max(12),
    customerChangeCutoffHours: z.coerce.number().int().min(0).max(240),
    slotIntervalMinutes: z.coerce
      .number()
      .int()
      .refine(value => SLOT_INTERVAL_OPTIONS.some(option => option === value)),
    // Une case décochée ne poste rien : l'absence vaut « non ».
    lateRequestsEnabled: z.preprocess(value => value === 'on', z.boolean()),
    lateRequestFloorHours: z.coerce.number().int().min(0).max(240),
  })
  .superRefine((settings, context) => {
    const minimumHorizonHours = settings.bookingHorizonMonths * 28 * 24
    if (settings.minBookingNoticeHours >= minimumHorizonHours)
      context.addIssue({
        code: 'custom',
        path: ['minBookingNoticeHours'],
        message:
          'Ce délai doit rester plus court que la période pendant laquelle on peut réserver.',
      })
    if (settings.customerChangeCutoffHours >= minimumHorizonHours)
      context.addIssue({
        code: 'custom',
        path: ['customerChangeCutoffHours'],
        message:
          'Ce délai doit rester plus court que la période pendant laquelle on peut réserver.',
      })
  })

export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>

export const saveBookingSettingsAudited = async (
  database: PrismaClient,
  input: BookingSettingsInput,
) =>
  database.$transaction(async transaction => {
    const previous = await transaction.bookingSettings.findUnique({
      where: { id: BOOKING_SETTINGS_ID },
    })
    const settings = await transaction.bookingSettings.upsert({
      where: { id: BOOKING_SETTINGS_ID },
      create: { id: BOOKING_SETTINGS_ID, ...input },
      update: input,
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'BOOKING_SETTINGS',
      entityId: settings.id,
      entityLabel: 'Règles de réservation',
      action: previous ? 'UPDATED' : 'CREATED',
      before: previous
        ? {
            minBookingNoticeHours: previous.minBookingNoticeHours,
            bookingHorizonMonths: previous.bookingHorizonMonths,
            customerChangeCutoffHours: previous.customerChangeCutoffHours,
            slotIntervalMinutes: previous.slotIntervalMinutes,
            lateRequestsEnabled: previous.lateRequestsEnabled,
            lateRequestFloorHours: previous.lateRequestFloorHours,
          }
        : undefined,
      after: input,
    })
    return settings
  })
