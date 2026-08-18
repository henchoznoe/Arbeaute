import { describe, expect, it, vi } from 'vitest'
import {
  buildCustomerSearchWhere,
  getAdminCustomerSearchPage,
} from '@/lib/admin/customer-search'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

const makeDatabase = (totalCount = 1) => {
  const count = vi.fn().mockResolvedValue(totalCount)
  const findMany = vi.fn().mockResolvedValue([])
  return {
    database: { customer: { count, findMany } } as unknown as PrismaClient,
    count,
    findMany,
  }
}

describe('recherche de clients', () => {
  it('écarte toujours les coordonnées effacées', () => {
    expect(buildCustomerSearchWhere('')).toEqual({ anonymizedAt: null })
  })

  it('cherche un nom partiel sous sa forme normalisée', () => {
    const where = buildCustomerSearchWhere('  Élodie  ')

    expect(where.anonymizedAt).toBeNull()
    expect(where.OR).toContainEqual({ searchName: { contains: 'elodie' } })
  })

  it('accepte une adresse quelle que soit sa casse', () => {
    expect(buildCustomerSearchWhere('Marie@Example.CH').OR).toContainEqual({
      emailNormalized: { contains: 'marie@example.ch' },
    })
  })

  it('retrouve un numéro à partir de ses seuls chiffres', () => {
    // Arzu recopie le numéro tel que son téléphone l'affiche, espaces et
    // indicatif compris : seuls les chiffres doivent compter.
    expect(buildCustomerSearchWhere('+41 79 123 45 67').OR).toContainEqual({
      phoneNormalized: { contains: '41791234567' },
    })
  })

  it('retrouve un numéro dicté sous sa forme nationale', () => {
    // Les numéros sont enregistrés « +41791234567 » mais se lisent
    // « 079 123 45 67 » : sans retirer le zéro initial, la recherche la plus
    // naturelle ne renvoyait jamais rien.
    expect(buildCustomerSearchWhere('079 123 45 67').OR).toContainEqual({
      phoneNormalized: { contains: '791234567' },
    })
  })

  it('ne cherche pas par téléphone sur un seul chiffre', () => {
    const where = buildCustomerSearchWhere('A1')

    expect(where.OR).toHaveLength(2)
    expect(JSON.stringify(where.OR)).not.toContain('phoneNormalized')
  })

  it('ne cherche pas par téléphone sur un zéro seul', () => {
    // Une fois le préfixe retiré, « 0 » ne porte plus aucun chiffre.
    const where = buildCustomerSearchWhere('0')

    expect(JSON.stringify(where.OR)).not.toContain('phoneNormalized')
  })

  it('affiche les personnes vues le plus récemment quand rien n’est saisi', async () => {
    const { database, findMany } = makeDatabase(3)

    const result = await getAdminCustomerSearchPage(database, {
      query: '',
      page: 1,
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { anonymizedAt: null },
        orderBy: [{ lastSeenAt: 'desc' }, { id: 'asc' }],
        skip: 0,
        take: 20,
      }),
    )
    expect(result.totalPages).toBe(1)
  })

  it('borne la page demandée au nombre de pages réellement disponibles', async () => {
    const { database, findMany } = makeDatabase(25)

    const result = await getAdminCustomerSearchPage(database, {
      query: '',
      page: 99,
    })

    expect(result.page).toBe(2)
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    )
  })

  it('reste sur une page valable quand aucun client ne correspond', async () => {
    const { database } = makeDatabase(0)

    const result = await getAdminCustomerSearchPage(database, {
      query: 'personne',
      page: 3,
    })

    expect(result).toMatchObject({ page: 1, totalPages: 1, totalCount: 0 })
  })
})
