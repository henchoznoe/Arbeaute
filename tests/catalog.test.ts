import { describe, expect, it } from 'vitest'
import {
  catalogCategories,
  catalogPackages,
  catalogServices,
} from '@/prisma/catalog'

describe('canonical catalog from Arzu photo', () => {
  it('contains the catalogue and the new body treatment', () => {
    expect(catalogCategories).toHaveLength(9)
    expect(catalogServices).toHaveLength(35)
    expect(new Set(catalogCategories.map(category => category.slug)).size).toBe(
      9,
    )
    expect(new Set(catalogServices.map(service => service.slug)).size).toBe(35)
  })

  it('defines the two initial packages with eligible services', () => {
    expect(catalogPackages).toHaveLength(2)
    expect(catalogPackages[0]).toMatchObject({
      sessionCount: 5,
      priceCents: 170_000,
    })
    expect(catalogPackages[1]?.serviceSlugs).not.toContain(
      'epilation-laser-corps-entier',
    )
  })

  it('keeps the photo prices when Agenda.ch differs', () => {
    const bySlug = new Map(
      catalogServices.map(service => [service.slug, service]),
    )
    expect(bySlug.get('laser-erbium-petite-zone')?.priceCents).toBe(18_000)
    expect(bySlug.get('laser-erbium-visage')?.priceCents).toBe(38_000)
    expect(bySlug.get('epilation-fil-sourcils')?.priceCents).toBe(2_500)
    expect(bySlug.get('epilation-fil-levre')?.priceCents).toBe(1_500)
    expect(bySlug.get('epilation-fil-visage-complet')?.priceCents).toBe(6_000)
  })

  it('keeps electrical hair removal visible but not bookable', () => {
    const service = catalogServices.find(
      item => item.slug === 'epilation-dielectrique-tarif',
    )
    expect(service).toMatchObject({
      priceCents: 200,
      priceNote: '/ min',
      isBookable: false,
    })
  })

  it('has 32 migratable images and unique Agenda source ids', () => {
    const sourceIds = catalogServices.flatMap(service =>
      service.agendaSourceId ? [service.agendaSourceId] : [],
    )
    expect(new Set(sourceIds).size).toBe(sourceIds.length)
    expect(
      catalogServices.filter(service => service.sourceImageUrl !== null),
    ).toHaveLength(32)
  })
})
