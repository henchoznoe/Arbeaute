import { isEmailConfigured } from '@/lib/core/env'
import prisma from '@/lib/core/prisma'
import { deliverClaimedEmail } from '@/lib/email/send'
import { buildAppointmentReminderMail } from '@/lib/email/templates'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import {
  addLocalDays,
  canCustomerChangeAppointment,
  getCustomerChangeDeadline,
  getLocalDateKey,
  getLocalDayBounds,
} from '@/lib/reservation/time'

const MINIMUM_REMINDER_LEAD_MS = 2 * 60 * 60_000
const STALE_PENDING_MS = 15 * 60_000
const MAX_REMINDER_ATTEMPTS = 2

export interface ReminderRunReport {
  throughDateKey: string
  sent: number
  failed: number
  skipped: number
  withoutEmail: number
}

const appointmentSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  customerEmail: true,
  customerFirstName: true,
  customerLastName: true,
  serviceNameSnapshot: true,
  servicePriceCents: true,
  service: { select: { category: { select: { name: true } } } },
} as const

type ReminderAppointment = Awaited<ReturnType<typeof loadReminderAppointment>>

const reminderKey = (appointmentId: string, startsAt: Date): string =>
  `appointment-reminder/${appointmentId}/${startsAt.toISOString()}`

const loadReminderAppointment = (appointmentId: string) =>
  prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      ...appointmentSelect,
      status: true,
    },
  })

const buildContent = (
  appointment: NonNullable<ReminderAppointment>,
  now: Date,
) =>
  buildAppointmentReminderMail({
    customerFirstName: appointment.customerFirstName,
    customerLastName: appointment.customerLastName,
    customerEmail: appointment.customerEmail,
    serviceLabel: formatServiceLabel(
      appointment.serviceNameSnapshot,
      appointment.service.category?.name ?? null,
    ),
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    priceCents: appointment.servicePriceCents,
    changeDeadline: canCustomerChangeAppointment(appointment.startsAt, now)
      ? getCustomerChangeDeadline(appointment.startsAt)
      : null,
  })

const claimDelivery = async ({
  appointment,
  subject,
  now,
}: {
  appointment: NonNullable<ReminderAppointment>
  subject: string
  now: Date
}): Promise<string | null> => {
  const deduplicationKey = reminderKey(appointment.id, appointment.startsAt)
  const created = await prisma.emailDelivery.createMany({
    data: [
      {
        kind: 'APPOINTMENT_REMINDER',
        status: 'PENDING',
        recipient: appointment.customerEmail as string,
        subject,
        appointmentId: appointment.id,
        appointmentStartsAt: appointment.startsAt,
        deduplicationKey,
      },
    ],
    skipDuplicates: true,
  })
  const delivery = await prisma.emailDelivery.findUnique({
    where: { deduplicationKey },
    select: {
      id: true,
      status: true,
      attempts: true,
      updatedAt: true,
    },
  })
  if (!delivery) return null
  if (created.count === 1) return delivery.id
  if (delivery.status === 'SENT' || delivery.attempts >= MAX_REMINDER_ATTEMPTS)
    return null

  const staleBefore = new Date(now.getTime() - STALE_PENDING_MS)
  if (delivery.status === 'PENDING' && delivery.updatedAt > staleBefore)
    return null

  const claimed = await prisma.emailDelivery.updateMany({
    where: {
      id: delivery.id,
      status: delivery.status,
      attempts: delivery.attempts,
      ...(delivery.status === 'PENDING'
        ? { updatedAt: { lte: staleBefore } }
        : {}),
    },
    data: {
      status: 'PENDING',
      recipient: appointment.customerEmail as string,
      subject,
      error: null,
      attempts: { increment: 1 },
    },
  })
  return claimed.count === 1 ? delivery.id : null
}

/**
 * Passage quotidien des rappels.
 *
 * La fenêtre couvre le reste d'aujourd'hui et demain : le passage normal part
 * la veille, tandis qu'un rendez-vous ajouté tard ou un échec peut encore être
 * rattrapé sans jamais écrire « demain » dans le message.
 */
export const runAppointmentReminders = async (
  now = new Date(),
): Promise<ReminderRunReport> => {
  const throughDateKey = addLocalDays(getLocalDateKey(now), 1)
  const end = getLocalDayBounds(throughDateKey).end
  const minimum = new Date(now.getTime() + MINIMUM_REMINDER_LEAD_MS)
  const report: ReminderRunReport = {
    throughDateKey,
    sent: 0,
    failed: 0,
    skipped: 0,
    withoutEmail: 0,
  }

  if (!isEmailConfigured) return report

  const [appointments, withoutEmail] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        startsAt: { gte: minimum, lt: end },
        customerEmail: { not: null },
      },
      orderBy: { startsAt: 'asc' },
      select: appointmentSelect,
    }),
    prisma.appointment.count({
      where: {
        status: 'CONFIRMED',
        startsAt: { gte: minimum, lt: end },
        customerEmail: null,
      },
    }),
  ])
  report.withoutEmail = withoutEmail

  for (const selected of appointments) {
    const content = buildContent({ ...selected, status: 'CONFIRMED' }, now)
    const deliveryId = await claimDelivery({
      appointment: { ...selected, status: 'CONFIRMED' },
      subject: content.subject,
      now,
    })
    if (!deliveryId) {
      report.skipped += 1
      continue
    }

    // Le rendez-vous peut avoir été annulé, déplacé ou corrigé pendant la
    // boucle. La seconde lecture réduit au minimum l'envoi d'une heure périmée.
    const current = await loadReminderAppointment(selected.id)
    const remainsEligible =
      current?.status === 'CONFIRMED' &&
      current.customerEmail !== null &&
      current.startsAt.getTime() === selected.startsAt.getTime() &&
      current.startsAt >= minimum &&
      current.startsAt < end

    if (!current || !remainsEligible) {
      await prisma.emailDelivery.delete({ where: { id: deliveryId } })
      report.skipped += 1
      continue
    }

    const currentContent = buildContent(current, now)
    await prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        recipient: current.customerEmail as string,
        subject: currentContent.subject,
      },
    })
    const outcome = await deliverClaimedEmail({
      deliveryId,
      idempotencyKey: reminderKey(current.id, current.startsAt),
      to: current.customerEmail as string,
      ...currentContent,
    })
    if (outcome === 'sent') report.sent += 1
    else if (outcome === 'failed') report.failed += 1
    else report.skipped += 1
  }

  return report
}
