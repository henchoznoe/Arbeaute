interface FilterableService {
  name: string
  description: string | null
}

interface FilterableCategory {
  id: string
  name: string
  services: FilterableService[]
}

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr-CH')
    .trim()

/** Filtrage purement local : le catalogue chargé reste l'unique source. */
export const filterCatalog = <TCategory extends FilterableCategory>(
  categories: TCategory[],
  query: string,
  categoryId: string | null,
): TCategory[] => {
  const normalizedQuery = normalizeSearchText(query)

  return categories
    .filter(category => categoryId === null || category.id === categoryId)
    .map(
      category =>
        ({
          ...category,
          services: category.services.filter(service =>
            normalizeSearchText(
              [category.name, service.name, service.description ?? ''].join(
                ' ',
              ),
            ).includes(normalizedQuery),
          ),
        }) as TCategory,
    )
    .filter(category => category.services.length > 0)
}
