'use client'

import { CalendarDays, Phone, Search, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useDeferredValue, useLayoutEffect, useRef, useState } from 'react'
import { ServiceDetails } from '@/components/catalog/service-details'
import { Button } from '@/components/ui/button'
import { filterCatalog } from '@/lib/catalog/filter'
import type { CatalogCategory } from '@/lib/catalog/queries'
import { contact } from '@/lib/constants/contact'
import { buildServiceReservationPath } from '@/lib/reservation/deep-link'

const formatPrice = (priceCents: number): string =>
  `${(priceCents / 100).toLocaleString('fr-CH')} CHF`

export const ServiceCatalog = ({
  categories,
}: Readonly<{ categories: CatalogCategory[] }>) => {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const scrollPositionRef = useRef<{
    categoryId: string | null
    top: number
  } | null>(null)
  const deferredQuery = useDeferredValue(query)
  const filteredCategories = filterCatalog(
    categories,
    deferredQuery,
    categoryId,
  )
  const resultCount = filteredCategories.reduce(
    (count, category) => count + category.services.length,
    0,
  )

  useLayoutEffect(() => {
    const request = scrollPositionRef.current
    if (request === null || request.categoryId !== categoryId) return
    const root = document.documentElement
    const previousScrollBehavior = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    window.scrollTo({ top: request.top })
    requestAnimationFrame(() => {
      window.scrollTo({ top: request.top })
      root.style.scrollBehavior = previousScrollBehavior
    })
    scrollPositionRef.current = null
  }, [categoryId])

  const selectCategory = (nextCategoryId: string | null) => {
    scrollPositionRef.current = {
      categoryId: nextCategoryId,
      top: window.scrollY,
    }
    setCategoryId(nextCategoryId)
  }

  return (
    <div>
      <div className="mx-auto mb-6 max-w-xl">
        <label htmlFor="service-search" className="sr-only">
          Rechercher une prestation
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="service-search"
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Nom, catégorie ou description…"
            className="h-12 w-full rounded-full border bg-card pr-12 pl-12 text-base shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Effacer la recherche"
              className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="sticky top-16 z-30 -mx-6 mb-8 border-y bg-background/95 px-6 py-2 backdrop-blur-md">
        <fieldset className="mx-auto flex min-w-0 max-w-6xl gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <legend className="sr-only">Filtrer par catégorie</legend>
          <button
            type="button"
            aria-pressed={categoryId === null}
            onClick={() => selectCategory(null)}
            className="h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground lg:px-3 lg:text-[13px]"
          >
            Toutes
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => selectCategory(category.id)}
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

      {filteredCategories.length > 0 ? (
        <div className="columns-1 gap-8 lg:columns-2">
          {filteredCategories.map(category => (
            <article
              key={category.id}
              className="mb-8 break-inside-avoid overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              <header
                className="px-5 py-4 text-primary-foreground"
                style={{ backgroundColor: category.color }}
              >
                <h3 className="font-heading text-xl font-bold uppercase">
                  {category.name}
                </h3>
                {category.description ? (
                  <p className="mt-1 text-sm text-white/80">
                    {category.description}
                  </p>
                ) : null}
              </header>
              <div className="divide-y">
                {category.services.map(service => (
                  <div
                    key={service.id}
                    className="flex items-start gap-4 px-4 py-4 even:bg-muted/45"
                  >
                    {service.imageUrl ? (
                      <Image
                        src={service.imageUrl}
                        alt=""
                        width={96}
                        height={96}
                        sizes="(min-width: 640px) 96px, 80px"
                        className="size-20 shrink-0 rounded-xl object-cover sm:size-24"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{service.name}</p>
                      {service.description ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {service.description}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#806b4d]">
                            {formatPrice(service.priceCents)}
                            {service.priceNote === '/ min' ? ' / min' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {service.durationMinutes} min
                          </p>
                        </div>
                        {service.isBookable ? (
                          <Button
                            asChild
                            size="lg"
                            className="h-11 rounded-full px-4"
                          >
                            <Link
                              href={buildServiceReservationPath(service.slug)}
                            >
                              <CalendarDays className="size-4" />
                              Réserver
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="h-11 rounded-full px-4"
                          >
                            <a href={`tel:${contact.phoneRaw}`}>
                              <Phone className="size-4" />
                              Nous appeler
                            </a>
                          </Button>
                        )}
                      </div>
                      <ServiceDetails service={service} className="mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
          <p className="font-heading text-xl font-bold">Aucun soin trouvé</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Essayez un autre mot ou affichez toutes les catégories.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setCategoryId(null)
            }}
            className="mt-5 h-11 rounded-full border px-5 text-sm font-medium hover:bg-muted"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  )
}
