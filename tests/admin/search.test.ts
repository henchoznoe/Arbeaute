import { describe, expect, it, vi } from 'vitest'
import { getAdminSearchPage } from '@/lib/admin/search'
import type { PrismaClient } from '@/prisma/generated/prisma/client'

const makeDatabase = (totalCount = 1) => {
  const count = vi.fn().mockResolvedValue(totalCount)
  const findMany = vi.fn().mockResolvedValue([])
  return {
    database: { appointment: { count, findMany } } as unknown as PrismaClient,
    count,
    findMany,
  }
}

describe('admin appointment search', () => {
  it('combines normalized identity, service, status, source and dates', async () => {
    const { database, count, findMany } = makeDatabase()

    await getAdminSearchPage(database, {
      query: ' MARIE@EXAMPLE.COM ',
      serviceId: 'service-1',
      status: 'COMPLETED',
      source: 'PUBLIC',
      from: '2026-08-10',
      to: '2026-08-11',
      page: 1,
    })

    const where = {
      customerEmail: 'marie@example.com',
      serviceId: 'service-1',
      status: 'COMPLETED',
      source: 'PUBLIC',
      startsAt: {
        gte: new Date('2026-08-09T22:00:00.000Z'),
        lt: new Date('2026-08-11T22:00:00.000Z'),
      },
    }
    expect(count).toHaveBeenCalledWith({ where })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, skip: 0, take: 20 }),
    )
  })

  it('uses the normalized name snapshot for accent-insensitive search', async () => {
    const { database, count } = makeDatabase(0)

    await getAdminSearchPage(database, {
      query: ' Élodie Dupont ',
      page: 1,
    })

    expect(count).toHaveBeenCalledWith({
      where: {
        customerSearchName: { contains: 'elodie dupont' },
        serviceId: undefined,
        status: undefined,
        source: undefined,
        startsAt: { gte: undefined, lt: undefined },
      },
    })
  })

  it('normalizes a complete Swiss phone number', async () => {
    const { database, count } = makeDatabase(0)

    await getAdminSearchPage(database, {
      query: '079 123 45 67',
      page: 1,
    })

    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({ customerPhone: '+41791234567' }),
    })
  })

  it('keeps pagination bounded on a volume larger than current data', async () => {
    const { database, findMany } = makeDatabase(237)

    const result = await getAdminSearchPage(database, {
      query: '',
      page: 500,
    })

    expect(result).toMatchObject({ page: 12, totalPages: 12, totalCount: 237 })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 220, take: 20 }),
    )
  })
})
