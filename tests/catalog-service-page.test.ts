import { describe, expect, it } from 'vitest'
import {
  buildServiceMetaDescription,
  buildServiceStaticParams,
  SERVICE_PAGE_VALIDATION_SLUG,
} from '@/lib/catalog/service-page'

describe('buildServiceStaticParams', () => {
  it('prépare toutes les prestations connues', () => {
    expect(buildServiceStaticParams(['soin-visage', 'onglerie'])).toEqual([
      { slug: 'soin-visage' },
      { slug: 'onglerie' },
    ])
  })

  it('garde une adresse de validation quand le catalogue est vide', () => {
    expect(buildServiceStaticParams([])).toEqual([
      { slug: SERVICE_PAGE_VALIDATION_SLUG },
    ])
  })
})

describe('buildServiceMetaDescription', () => {
  it('rend les soins homonymes distincts grâce à leur groupe', () => {
    const description = 'Un soin ciblé pour votre peau.'
    const base = {
      serviceName: 'Visage',
      description,
      durationMinutes: 45,
      priceCents: 10_000,
      priceNote: null,
    }

    expect(
      buildServiceMetaDescription({ ...base, categoryName: 'Laser Erbium' }),
    ).not.toBe(
      buildServiceMetaDescription({ ...base, categoryName: 'Endosphères' }),
    )
  })

  it('mentionne Bulle, la durée et le tarif sans dépasser 160 caractères', () => {
    const description = buildServiceMetaDescription({
      serviceName: 'Visage et décolleté',
      categoryName: 'Laser Erbium',
      description:
        'Une description volontairement très longue qui présente le soin avec assez de détails pour dépasser la taille utile dans les résultats de recherche Google.',
      durationMinutes: 75,
      priceCents: 38_000,
      priceNote: null,
    })

    expect(description).toContain('Laser Erbium — Visage et décolleté')
    expect(description).toContain('à Bulle')
    expect(description).toContain('75 min')
    expect(description).toContain('380\u00a0CHF')
    expect(description.length).toBeLessThanOrEqual(160)
    expect(description).toMatch(/…$/)
  })

  it('précise le tarif à la minute', () => {
    expect(
      buildServiceMetaDescription({
        serviceName: 'Tarif',
        categoryName: 'Épilation diélectrique',
        description: null,
        durationMinutes: 15,
        priceCents: 200,
        priceNote: '/ min',
      }),
    ).toContain('2\u00a0CHF / min')
  })
})
