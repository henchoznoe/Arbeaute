'use client'

import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Le champ de recherche, les pastilles de catégorie et le décompte : une seule
 * fois, pour les deux écrans qui présentent le catalogue.
 *
 * La vitrine les possédait depuis la v1. L'étape 1 du tunnel, elle, alignait
 * les prestations groupées par catégorie sur près de cinq mille pixels — six
 * écrans de téléphone — sans rien pour s'y retrouver. Or quelqu'un qui arrive
 * par la barre du bas, par le raccourci de la PWA ou par le pied de page n'a
 * jamais vu la vitrine : il perdait l'outil que la page d'accueil lui donnait.
 *
 * Partager le composant est ce qui garantit qu'il n'en existe pas deux
 * variantes qui dériveraient l'une de l'autre.
 */
interface CatalogFiltersProps {
  categories: Array<{ id: string; name: string }>
  query: string
  onQueryChange: (query: string) => void
  categoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
  resultCount: number
  /** Deux écrans peuvent porter le champ : l'identifiant doit rester unique. */
  searchId: string
  /** La vitrine colle ses pastilles sous l'en-tête ; le tunnel ne colle rien. */
  pillsClassName?: string
}

export const CatalogFilters = ({
  categories,
  query,
  onQueryChange,
  categoryId,
  onCategoryChange,
  resultCount,
  searchId,
  pillsClassName = 'mb-6',
}: Readonly<CatalogFiltersProps>) => (
  <>
    <div className="mx-auto mb-6 max-w-xl">
      <label htmlFor={searchId} className="sr-only">
        Rechercher une prestation
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          placeholder="Nom, catégorie ou description…"
          className="h-12 w-full rounded-full border bg-card pr-12 pl-12 text-base shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onQueryChange('')}
            aria-label="Effacer la recherche"
            className="absolute top-1/2 right-0.5 -translate-y-1/2 rounded-full text-muted-foreground"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>

    <div className={pillsClassName}>
      <fieldset className="mx-auto flex min-w-0 max-w-6xl gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <legend className="sr-only">Filtrer par catégorie</legend>
        <button
          type="button"
          aria-pressed={categoryId === null}
          onClick={() => onCategoryChange(null)}
          className="h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground lg:px-3 lg:text-[13px]"
        >
          Toutes
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            type="button"
            aria-pressed={categoryId === category.id}
            onClick={() => onCategoryChange(category.id)}
            className="h-11 shrink-0 rounded-full border bg-card px-4 text-sm font-medium transition aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground lg:px-3 lg:text-[13px]"
          >
            {category.name}
          </button>
        ))}
      </fieldset>
    </div>

    <p className="mb-5 text-sm text-muted-foreground" aria-live="polite">
      {resultCount}{' '}
      {resultCount > 1 ? 'prestations trouvées' : 'prestation trouvée'}
    </p>
  </>
)

/** Ce que voit une recherche sans résultat : la sortie, et rien d'autre. */
export const CatalogEmptyState = ({
  onReset,
}: Readonly<{ onReset: () => void }>) => (
  <div className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
    <p className="font-heading text-xl font-bold">Aucun soin trouvé</p>
    <p className="mt-2 text-sm text-muted-foreground">
      Essayez un autre mot ou affichez toutes les catégories.
    </p>
    <Button
      type="button"
      variant="outline"
      onClick={onReset}
      className="mt-5 rounded-full"
    >
      Réinitialiser les filtres
    </Button>
  </div>
)
