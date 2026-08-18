import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hasSameOrigin: vi.fn(),
  checkRateLimit: vi.fn(),
  findFirst: vi.fn(),
  getRequestIp: vi.fn(),
}))

vi.mock('@/lib/utils/request', () => ({
  hasSameOrigin: mocks.hasSameOrigin,
  getRequestIp: mocks.getRequestIp,
}))
vi.mock('@/lib/services/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))
vi.mock('@/lib/core/prisma', () => ({
  default: { customer: { findFirst: mocks.findFirst } },
}))

import { lookupCustomerByEmail } from '@/lib/actions/reservation'

describe('lookupCustomerByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasSameOrigin.mockResolvedValue(true)
    mocks.getRequestIp.mockResolvedValue('203.0.113.1')
    mocks.checkRateLimit.mockResolvedValue({ allowed: true })
  })

  it('reconnaît une adresse déjà enregistrée', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'customer-1' })

    await expect(lookupCustomerByEmail('Marie@Example.CH')).resolves.toEqual({
      known: true,
    })
    // L'adresse est normalisée avant la recherche : la casse ne doit pas
    // décider si quelqu'un ressaisit ses coordonnées ou non.
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { emailNormalized: 'marie@example.ch', anonymizedAt: null },
      }),
    )
  })

  it('ne renvoie rien d’autre qu’un booléen', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'customer-1' })

    const result = await lookupCustomerByEmail('marie@example.ch')

    expect(Object.keys(result)).toEqual(['known'])
  })

  it('répond « inconnue » quand la limite de tentatives est atteinte', async () => {
    // Le repli n'est pas bloquant : le second formulaire s'affiche, et la
    // réservation aboutit — la fiche existante sera simplement mise à jour.
    mocks.checkRateLimit.mockResolvedValue({ allowed: false })

    await expect(lookupCustomerByEmail('marie@example.ch')).resolves.toEqual({
      known: false,
    })
    expect(mocks.findFirst).not.toHaveBeenCalled()
  })

  it('répond « inconnue » sur une requête d’une autre origine', async () => {
    mocks.hasSameOrigin.mockResolvedValue(false)

    await expect(lookupCustomerByEmail('marie@example.ch')).resolves.toEqual({
      known: false,
    })
    expect(mocks.findFirst).not.toHaveBeenCalled()
  })

  it('répond « inconnue » sur une adresse mal formée, sans lever', async () => {
    await expect(lookupCustomerByEmail('pas-une-adresse')).resolves.toEqual({
      known: false,
    })
  })

  it('ne reconnaît pas une fiche dont les coordonnées ont été effacées', async () => {
    mocks.findFirst.mockResolvedValue(null)

    await expect(lookupCustomerByEmail('marie@example.ch')).resolves.toEqual({
      known: false,
    })
  })
})
