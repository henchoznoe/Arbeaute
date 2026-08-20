import { describe, expect, it } from 'vitest'
import { createRobots } from '@/app/robots'
import {
  createCatalogPriceRange,
  createLocalBusinessJsonLd,
  createPageMetadata,
  createWebsiteJsonLd,
} from '@/lib/config/seo'
import { siteConfig } from '@/lib/config/site'

describe('métadonnées des pages publiques', () => {
  it('conserve une image Open Graph et Twitter sur les pages enfants', () => {
    const metadata = createPageMetadata({
      title: 'Nos prestations',
      description: 'Toutes les prestations de l’institut.',
      path: '/prestations',
    })

    expect(metadata.openGraph).toMatchObject({
      images: [
        {
          url: siteConfig.ogImage,
          alt: 'Arbeauté — Soins esthétiques à Bulle',
        },
      ],
    })
    expect(metadata.twitter).toMatchObject({
      images: [
        {
          url: siteConfig.ogImage,
          alt: 'Arbeauté — Soins esthétiques à Bulle',
        },
      ],
    })
  })

  it('emploie la photo propre au soin quand elle existe', () => {
    const image = {
      url: 'https://images.example/soin.jpg',
      alt: 'Laser Erbium — Visage chez Arbeauté',
    }
    const metadata = createPageMetadata({
      title: 'Laser Erbium — Visage',
      description: 'Le soin du visage à Bulle.',
      path: '/prestations/laser-erbium-visage',
      image,
    })

    expect(metadata.openGraph).toMatchObject({ images: [image] })
    expect(metadata.twitter).toMatchObject({ images: [image] })
  })
})

describe('directives pour les robots', () => {
  it('autorise l’exploration en production pour que les noindex soient lus', () => {
    expect(createRobots('production')).toEqual({
      rules: { userAgent: '*', allow: '/' },
      sitemap: `${siteConfig.url}/sitemap.xml`,
    })
  })

  it('bloque entièrement les déploiements de prévisualisation', () => {
    expect(createRobots('preview')).toEqual({
      rules: [{ userAgent: '*', disallow: '/' }],
    })
  })
})

describe('données structurées', () => {
  it('déclare le nom du site sur la page d’accueil', () => {
    expect(createWebsiteJsonLd()).toMatchObject({
      '@type': 'WebSite',
      name: 'Arbeauté',
      alternateName: 'Arbeauté Bulle',
      url: siteConfig.url,
      inLanguage: 'fr-CH',
    })
  })

  it('calcule une fourchette de prix réelle', () => {
    expect(createCatalogPriceRange([])).toBeUndefined()
    expect(createCatalogPriceRange([7_500])).toBe('75\u00a0CHF')
    expect(createCatalogPriceRange([38_000, 2_500, 10_000])).toBe(
      '25\u00a0CHF–380\u00a0CHF',
    )
  })

  it('décrit l’institut avec une photo et la fourchette calculée', () => {
    const jsonLd = createLocalBusinessJsonLd(
      [
        {
          day: 'Lundi',
          ranges: [{ start: '09:00', end: '18:00' }],
        },
      ],
      '25\u00a0CHF–380\u00a0CHF',
    )

    expect(jsonLd).toMatchObject({
      '@type': 'BeautySalon',
      image: `${siteConfig.url}/arzu.jpeg`,
      priceRange: '25\u00a0CHF–380\u00a0CHF',
      openingHoursSpecification: [
        {
          dayOfWeek: 'https://schema.org/Monday',
          opens: '09:00',
          closes: '18:00',
        },
      ],
    })
  })
})
