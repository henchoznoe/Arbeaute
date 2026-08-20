import { describe, expect, it } from 'vitest'
import {
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
