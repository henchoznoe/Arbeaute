import { describe, expect, it, vi } from 'vitest'
import {
  AGENDA_SETTINGS_ID,
  agendaSettingsSchema,
  DEFAULT_AGENDA_VISIBLE_DAYS,
  formatAgendaVisibleDays,
  saveAgendaSettingsAudited,
} from '@/lib/admin/agenda-settings'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

describe('agendaSettingsSchema', () => {
  it('remet les jours dans l’ordre de lecture, lundi d’abord', () => {
    const parsed = agendaSettingsSchema.parse({ visibleDays: [0, 3, 1] })

    expect(parsed.visibleDays).toEqual([1, 3, 0])
  })

  it('accepte les valeurs d’un formulaire, qui arrivent en texte', () => {
    const parsed = agendaSettingsSchema.parse({ visibleDays: ['1', '2'] })

    expect(parsed.visibleDays).toEqual([1, 2])
  })

  it('dédoublonne un même jour envoyé deux fois', () => {
    const parsed = agendaSettingsSchema.parse({ visibleDays: [2, 2, 5] })

    expect(parsed.visibleDays).toEqual([2, 5])
  })

  it('refuse une semaine sans aucun jour affiché', () => {
    expect(agendaSettingsSchema.safeParse({ visibleDays: [] }).success).toBe(
      false,
    )
  })

  it('refuse un jour hors des sept', () => {
    expect(agendaSettingsSchema.safeParse({ visibleDays: [7] }).success).toBe(
      false,
    )
  })
})

describe('formatAgendaVisibleDays', () => {
  it('résume la semaine entière sans énumérer les sept jours', () => {
    expect(formatAgendaVisibleDays(DEFAULT_AGENDA_VISIBLE_DAYS)).toBe(
      'Tous les jours affichés',
    )
  })

  it('nomme les jours retenus dans l’ordre de la semaine', () => {
    expect(formatAgendaVisibleDays([3, 1])).toBe('Lundi, Mercredi affichés')
  })
})

describe('saveAgendaSettingsAudited', () => {
  it('écrit la ligne unique et son événement d’audit dans une transaction', async () => {
    const transaction = {
      agendaSettings: {
        findUnique: vi.fn().mockResolvedValue({ visibleDays: [1, 2, 3, 4, 5] }),
        upsert: vi
          .fn()
          .mockResolvedValue({ id: AGENDA_SETTINGS_ID, visibleDays: [1, 2] }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
    }
    const database = {
      $transaction: vi.fn(callback => callback(transaction)),
    } as unknown as PrismaClient

    await saveAgendaSettingsAudited(database, { visibleDays: [1, 2] })

    expect(transaction.agendaSettings.upsert).toHaveBeenCalledWith({
      where: { id: AGENDA_SETTINGS_ID },
      create: { id: AGENDA_SETTINGS_ID, visibleDays: [1, 2] },
      update: { visibleDays: [1, 2] },
    })
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'ADMIN',
        entityType: 'AGENDA_SETTINGS',
        action: 'UPDATED',
        changes: {
          before: {
            visibleDays: 'Lundi, Mardi, Mercredi, Jeudi, Vendredi affichés',
          },
          after: { visibleDays: 'Lundi, Mardi affichés' },
        },
      }),
    })
  })

  it('enregistre une création quand la ligne n’existait pas', async () => {
    const transaction = {
      agendaSettings: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi
          .fn()
          .mockResolvedValue({ id: AGENDA_SETTINGS_ID, visibleDays: [6] }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
    }
    const database = {
      $transaction: vi.fn(callback => callback(transaction)),
    } as unknown as PrismaClient

    await saveAgendaSettingsAudited(database, { visibleDays: [6] })

    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'CREATED' }),
    })
  })
})
