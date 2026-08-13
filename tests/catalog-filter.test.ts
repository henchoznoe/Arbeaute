import { describe, expect, it } from 'vitest'
import { filterCatalog } from '@/lib/catalog/filter'

const catalog = [
  {
    id: 'visage',
    name: 'Soins visage',
    services: [
      {
        name: 'Peeling éclat',
        description: 'Un soin doux contre les taches.',
      },
    ],
  },
  {
    id: 'ongles',
    name: 'Onglerie',
    services: [{ name: 'Dépose', description: null }],
  },
]

describe('filtrage local du catalogue', () => {
  it.each(['peeling', 'ECLAT', 'tâches', 'visage'])(
    'trouve une prestation avec « %s »',
    query => {
      expect(filterCatalog(catalog, query, null)).toEqual([catalog[0]])
    },
  )

  it('combine la recherche et la catégorie sans modifier la source', () => {
    expect(filterCatalog(catalog, '', 'ongles')).toEqual([catalog[1]])
    expect(catalog).toHaveLength(2)
  })
})
