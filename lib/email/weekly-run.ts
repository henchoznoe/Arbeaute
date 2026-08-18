import { env } from '@/lib/core/env'
import prisma from '@/lib/core/prisma'
import { deliverEmail } from '@/lib/email/send'
import { buildWeeklyDigestMail } from '@/lib/email/templates'
import {
  buildWeeklySummary,
  formatWorkedDuration,
} from '@/lib/email/weekly-summary'
import {
  addLocalDays,
  formatDayDate,
  getLocalDateKey,
  getLocalDayBounds,
  getLocalWeekDateKeys,
} from '@/lib/reservation/time'

/**
 * Le bilan hebdomadaire d'Arzu, la seule tâche planifiée du projet.
 *
 * **La semaine se calcule en dates locales, jamais en « 168 dernières
 * heures ».** Le plan Vercel Hobby déclenche à l'heure près et non à la minute,
 * et le cron est en UTC : `0 18 * * 0` tombe à 20 h en été et 19 h en hiver.
 * Rien ici ne doit dépendre d'un horaire exact.
 */

export interface WeeklyRunReport {
  periodLabel: string
  visitCount: number
  digest: 'sent' | 'failed' | 'skipped'
}

const appointmentSelect = {
  startsAt: true,
  endsAt: true,
  serviceDurationMinutes: true,
  servicePriceCents: true,
  serviceNameSnapshot: true,
  status: true,
} as const

export const runWeeklyDigest = async (
  now = new Date(),
): Promise<WeeklyRunReport> => {
  // Le dimanche soir, la semaine écoulée est celle qui contient aujourd'hui.
  // Un déclenchement tardif, passé minuit, viserait la semaine suivante :
  // l'ancrage se prend donc sur la veille dès que l'on est lundi.
  const todayKey = getLocalDateKey(now)
  const weekDays = getLocalWeekDateKeys(todayKey)
  const [firstDay] = weekDays
  const lastDay = weekDays.at(-1) as string

  const start = getLocalDayBounds(firstDay).start
  const end = getLocalDayBounds(lastDay).end
  const nextStart = getLocalDayBounds(addLocalDays(firstDay, 7)).start
  const nextEnd = getLocalDayBounds(addLocalDays(lastDay, 7)).end

  const periodLabel = `du ${formatDayDate(start)} au ${formatDayDate(getLocalDayBounds(lastDay).start)}`

  const [appointments, upcomingCount] = await Promise.all([
    prisma.appointment.findMany({
      where: { startsAt: { gte: start, lt: end } },
      orderBy: { startsAt: 'asc' },
      select: appointmentSelect,
    }),
    prisma.appointment.count({
      where: {
        status: 'CONFIRMED',
        startsAt: { gte: nextStart, lt: nextEnd },
      },
    }),
  ])

  const summary = buildWeeklySummary(appointments, now)

  const recipient = env.ADMIN_NOTIFICATION_EMAIL
  if (!recipient)
    return { periodLabel, visitCount: summary.visitCount, digest: 'skipped' }

  const content = buildWeeklyDigestMail({
    periodLabel,
    visitCount: summary.visitCount,
    workedLabel: formatWorkedDuration(summary.workedMinutes),
    revenueCents: summary.revenueCents,
    noShowCount: summary.noShowCount,
    topServiceLabel: summary.topServiceLabel,
    upcomingCount,
  })

  const digest = await deliverEmail({
    kind: 'WEEKLY_DIGEST',
    to: recipient,
    ...content,
  })

  return { periodLabel, visitCount: summary.visitCount, digest }
}
