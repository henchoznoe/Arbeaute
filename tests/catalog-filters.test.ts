import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { filterCatalog } from '@/lib/catalog/filter'

/**
 * L'étape 1 du tunnel alignait les prestations groupées par catégorie sur près
 * de cinq mille pixels — six écrans de téléphone — sans recherche ni filtre,
 * alors que la vitrine en dispose depuis la v1. Quelqu'un qui arrive
 * directement sur `/reservation` perdait l'outil que la page d'accueil lui
 * donnait.
 */
const WIZARD = readFileSync(
  'components/reservation/reservation-wizard.tsx',
  'utf8',
)
const SHOWCASE = readFileSync('components/sections/service-catalog.tsx', 'utf8')

describe('recherche du catalogue', () => {
  it('n’existe qu’en un seul exemplaire', () => {
    // Les deux écrans montent le même composant : aucun ne réécrit le champ.
    for (const source of [WIZARD, SHOWCASE]) {
      expect(source).toContain('<CatalogFilters')
      expect(source).toContain('<CatalogEmptyState')
      expect(source).not.toContain('type="search"')
    }
  })

  it('n’ajoute aucune fonction de filtrage ni requête serveur', () => {
    expect(WIZARD).toContain(
      "import { filterCatalog } from '@/lib/catalog/filter'",
    )
    // Le catalogue est déjà chargé à cette étape : rien à demander de plus.
    expect(WIZARD).not.toContain('getPublicCatalog')
  })

  it('oublie le filtre dès qu’on change d’étape', () => {
    const goToStep = WIZARD.slice(
      WIZARD.indexOf('const goToStep = useCallback('),
      WIZARD.indexOf('const goToWeek'),
    )
    expect(goToStep).toContain("setCatalogQuery('')")
    expect(goToStep).toContain('setCatalogCategoryId(null)')
  })
})

/**
 * Le tunnel reçoit une liste plate ; `filterCatalog` travaille par catégorie.
 * Le regroupement doit donc rendre exactement ce que la vitrine rendrait.
 */
describe('regroupement de la liste plate du tunnel', () => {
  const services = [
    {
      id: '1',
      name: 'Épilation sourcils',
      description: null,
      categoryName: 'Épilation',
    },
    {
      id: '2',
      name: 'Soin éclat',
      description: 'Peau fatiguée',
      categoryName: 'Visage',
    },
    {
      id: '3',
      name: 'Épilation jambes',
      description: null,
      categoryName: 'Épilation',
    },
  ]

  const group = (query: string, categoryId: string | null) => {
    const categories = [
      ...new Map(
        services.map(service => [
          service.categoryName,
          { id: service.categoryName, name: service.categoryName },
        ]),
      ).values(),
    ]
    return filterCatalog(
      categories.map(category => ({
        ...category,
        services: services.filter(
          service => service.categoryName === category.name,
        ),
      })),
      query,
      categoryId,
    )
  }

  it('rend toutes les catégories sans filtre', () => {
    expect(group('', null).map(category => category.name)).toEqual([
      'Épilation',
      'Visage',
    ])
  })

  it('cherche sans se soucier des accents ni de la casse', () => {
    const found = group('epilation', null)
    expect(found).toHaveLength(1)
    expect(found[0].services).toHaveLength(2)
  })

  it('cherche aussi dans la description', () => {
    expect(group('fatiguée', null)[0].services[0].name).toBe('Soin éclat')
  })

  it('ne rend rien quand rien ne correspond', () => {
    expect(group('massage', null)).toEqual([])
  })

  it('limite la liste à la pastille choisie', () => {
    expect(group('', 'Visage').map(category => category.name)).toEqual([
      'Visage',
    ])
  })
})
