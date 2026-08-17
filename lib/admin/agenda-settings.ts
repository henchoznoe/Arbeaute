import { z } from 'zod/v4'
import { writeAuditEvent } from '@/lib/admin/audit'
import prisma from '@/lib/core/prisma'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

export const AGENDA_SETTINGS_ID = 'default'

/** Lundi d'abord, dimanche en dernier : l'ordre dans lequel l'agenda se lit. */
export const AGENDA_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

export const AGENDA_DAY_LABELS: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  0: 'Dimanche',
}

export const DEFAULT_AGENDA_VISIBLE_DAYS: number[] = [...AGENDA_DAY_ORDER]

export interface AgendaSettingsValues {
  visibleDays: number[]
}

const sortByAgendaOrder = (days: number[]): number[] =>
  AGENDA_DAY_ORDER.filter(day => days.includes(day))

export const agendaSettingsSchema = z.object({
  visibleDays: z
    .array(z.coerce.number().int().min(0).max(6))
    .min(1, 'Gardez au moins un jour affiché.')
    .transform(days => sortByAgendaOrder([...new Set(days)])),
})

export type AgendaSettingsInput = z.infer<typeof agendaSettingsSchema>

/**
 * Jours affichés par la grille de semaine.
 *
 * Volontairement sans `'use cache'` : la requête est minuscule, l'agenda est de
 * toute façon dynamique, et une valeur de repli mise en cache pour toujours
 * serait pire que la requête évitée.
 *
 * L'échec est absorbé parce que les previews Vercel lisent la base de
 * production, qui ne migre qu'aux déploiements de production : la table peut
 * donc manquer alors que le code, lui, est déjà déployé. Un agenda qui montre
 * les sept jours vaut mieux qu'un agenda qui ne s'ouvre pas.
 */
export const getAgendaSettings = async (): Promise<AgendaSettingsValues> => {
  try {
    const settings = await prisma.agendaSettings.findUnique({
      where: { id: AGENDA_SETTINGS_ID },
      select: { visibleDays: true },
    })
    const visibleDays = sortByAgendaOrder(settings?.visibleDays ?? [])
    return {
      visibleDays: visibleDays.length
        ? visibleDays
        : DEFAULT_AGENDA_VISIBLE_DAYS,
    }
  } catch {
    return { visibleDays: DEFAULT_AGENDA_VISIBLE_DAYS }
  }
}

export const formatAgendaVisibleDays = (visibleDays: number[]): string =>
  visibleDays.length === AGENDA_DAY_ORDER.length
    ? 'Tous les jours affichés'
    : `${sortByAgendaOrder(visibleDays)
        .map(day => AGENDA_DAY_LABELS[day])
        .join(', ')} affichés`

export const saveAgendaSettingsAudited = async (
  database: PrismaClient,
  input: AgendaSettingsInput,
) =>
  database.$transaction(async transaction => {
    const previous = await transaction.agendaSettings.findUnique({
      where: { id: AGENDA_SETTINGS_ID },
    })
    const settings = await transaction.agendaSettings.upsert({
      where: { id: AGENDA_SETTINGS_ID },
      create: { id: AGENDA_SETTINGS_ID, ...input },
      update: input,
    })
    await writeAuditEvent(transaction, {
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'AGENDA_SETTINGS',
      entityId: settings.id,
      entityLabel: 'Jours affichés dans l’agenda',
      action: previous ? 'UPDATED' : 'CREATED',
      before: previous
        ? { visibleDays: formatAgendaVisibleDays(previous.visibleDays) }
        : undefined,
      after: { visibleDays: formatAgendaVisibleDays(settings.visibleDays) },
    })
    return settings
  })
