import { formatServiceLabel } from '@/lib/reservation/service-label'
import type { AppointmentStatus } from '@/prisma/generated/prisma/enums'

/**
 * Les chiffres de la semaine écoulée, calculés sans base de données.
 *
 * **Un rendez-vous confirmé dont l'heure est passée est une visite réalisée.**
 * C'est la règle du projet depuis la v2 — plus rien n'écrit `COMPLETED`, et
 * `getAdminCustomerProfile` compte déjà les visites ainsi. Le montant annoncé
 * ici est donc bien du réalisé, pas du prévu.
 *
 * Ce module ne réutilise pas `buildDashboardMetrics` : celui-ci raisonne autour
 * d'une journée d'ancrage et calcule un taux d'occupation dont le bilan n'a que
 * faire, au prix de deux requêtes d'ouvertures et d'exceptions.
 */

export interface WeeklySummaryAppointment {
  startsAt: Date
  endsAt: Date
  serviceDurationMinutes: number
  servicePriceCents: number
  serviceNameSnapshot: string
  /**
   * Le groupe de la prestation. Sans lui, les trois « Visage » du catalogue —
   * Laser Erbium, Endosphères et Épilation laser — tombaient dans le même
   * compteur : ce n'était pas seulement le libellé qui était ambigu, c'était le
   * classement qui était faux.
   */
  categoryName: string | null
  status: AppointmentStatus
}

export interface WeeklySummary {
  /** Rendez-vous honorés : confirmés, et dont l'heure est passée. */
  visitCount: number
  workedMinutes: number
  revenueCents: number
  /** Absences notées. Vaut 0 quand rien n'a été noté. */
  noShowCount: number
  /** Le soin le plus donné, ou `null` si la semaine est vide. */
  topServiceLabel: string | null
}

const isRealised = (
  appointment: WeeklySummaryAppointment,
  now: Date,
): boolean =>
  appointment.status === 'CONFIRMED' &&
  appointment.endsAt.getTime() <= now.getTime()

export const buildWeeklySummary = (
  appointments: WeeklySummaryAppointment[],
  now: Date,
): WeeklySummary => {
  const realised = appointments.filter(appointment =>
    isRealised(appointment, now),
  )

  const counts = new Map<string, number>()
  for (const appointment of realised) {
    const label = formatServiceLabel(
      appointment.serviceNameSnapshot,
      appointment.categoryName,
    )
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  // À égalité, le premier par ordre alphabétique : un bilan ne doit pas changer
  // d'avis d'une lecture à l'autre.
  const topServiceLabel =
    [...counts.entries()].sort(
      (first, second) =>
        second[1] - first[1] || first[0].localeCompare(second[0], 'fr'),
    )[0]?.[0] ?? null

  return {
    visitCount: realised.length,
    workedMinutes: realised.reduce(
      (total, appointment) => total + appointment.serviceDurationMinutes,
      0,
    ),
    revenueCents: realised.reduce(
      (total, appointment) => total + appointment.servicePriceCents,
      0,
    ),
    noShowCount: appointments.filter(
      appointment => appointment.status === 'NO_SHOW',
    ).length,
    topServiceLabel,
  }
}

/** « 6 h 30 », « 45 min » — jamais « 390 minutes ». */
export const formatWorkedDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0
    ? `${hours} h`
    : `${hours} h ${String(rest).padStart(2, '0')}`
}
