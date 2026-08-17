import { env } from '@/lib/core/env'
import prisma from '@/lib/core/prisma'
import { deliverEmail } from '@/lib/email/send'
import {
  buildDailyDigestMail,
  buildReminderMail,
  type DigestEntry,
  formatMailDate,
  formatMailTime,
} from '@/lib/email/templates'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import {
  addLocalDays,
  getLocalDateKey,
  getLocalDayBounds,
} from '@/lib/reservation/time'

/**
 * Passage quotidien : rappels aux personnes attendues et récapitulatif à Arzu.
 *
 * Les deux tiennent dans une seule tâche planifiée, la seule que l'offre
 * Vercel Hobby autorise sans surcoût. Une seule lecture couvre la journée du
 * lendemain, et sert aux deux envois.
 */

export interface DailyRunReport {
  dateKey: string
  reminders: { sent: number; failed: number; skipped: number }
  digest: 'sent' | 'failed' | 'skipped'
}

export const runDailyEmails = async (
  now = new Date(),
): Promise<DailyRunReport> => {
  const dateKey = addLocalDays(getLocalDateKey(now), 1)
  const { start, end } = getLocalDayBounds(dateKey)

  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      startsAt: { gte: start, lt: end },
    },
    orderBy: { startsAt: 'asc' },
    select: {
      id: true,
      startsAt: true,
      customerEmail: true,
      customerPhone: true,
      customerFirstName: true,
      customerLastName: true,
      serviceNameSnapshot: true,
      servicePriceCents: true,
      service: { select: { category: { select: { name: true } } } },
    },
  })

  const reminders = { sent: 0, failed: 0, skipped: 0 }
  for (const appointment of appointments) {
    if (!appointment.customerEmail) {
      reminders.skipped += 1
      continue
    }
    const serviceLabel = formatServiceLabel(
      appointment.serviceNameSnapshot,
      appointment.service.category?.name,
    )
    const content = buildReminderMail({
      customerFirstName: appointment.customerFirstName,
      customerLastName: appointment.customerLastName,
      serviceLabel,
      startsAt: appointment.startsAt,
      priceCents: appointment.servicePriceCents,
    })
    const outcome = await deliverEmail({
      kind: 'APPOINTMENT_REMINDER',
      to: appointment.customerEmail,
      appointmentId: appointment.id,
      ...content,
    })
    reminders[outcome] += 1
  }

  const recipient = env.ADMIN_NOTIFICATION_EMAIL
  if (!recipient) return { dateKey, reminders, digest: 'skipped' }

  const entries: DigestEntry[] = appointments.map(appointment => ({
    time: formatMailTime(appointment.startsAt),
    customerName:
      [appointment.customerFirstName, appointment.customerLastName]
        .filter(Boolean)
        .join(' ') || 'Sans nom',
    serviceLabel: formatServiceLabel(
      appointment.serviceNameSnapshot,
      appointment.service.category?.name,
    ),
    phone: appointment.customerPhone,
  }))

  const digestContent = buildDailyDigestMail(formatMailDate(start), entries)
  const digest = await deliverEmail({
    kind: 'DAILY_DIGEST',
    to: recipient,
    ...digestContent,
  })

  return { dateKey, reminders, digest }
}
