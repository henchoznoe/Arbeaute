'use client'

import { CalendarDays, Phone } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useDeferredValue, useLayoutEffect, useRef, useState } from 'react'
import {
  CatalogEmptyState,
  CatalogFilters,
} from '@/components/catalog/catalog-filters'
import { ServiceDetails } from '@/components/catalog/service-details'
import { Button } from '@/components/ui/button'
import { filterCatalog } from '@/lib/catalog/filter'
import type { CatalogCategory } from '@/lib/catalog/queries'
import { contact } from '@/lib/constants/contact'
import { buildServiceReservationPath } from '@/lib/reservation/deep-link'
import { getReadableInk, getSecondaryInkOpacity } from '@/lib/utils/contrast'
import { formatPrice } from '@/lib/utils/format'

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
      <CatalogFilters
        categories={categories}
        query={query}
        onQueryChange={setQuery}
        categoryId={categoryId}
        onCategoryChange={selectCategory}
        resultCount={resultCount}
        searchId="service-search"
        pillsClassName="sticky top-16 z-30 -mx-6 mb-8 border-y bg-background/95 px-6 py-2 backdrop-blur-md"
      />

      {filteredCategories.length > 0 ? (
        <div className="columns-1 gap-8 lg:columns-2">
          {filteredCategories.map(category => (
            <article
              key={category.id}
              className="mb-8 break-inside-avoid overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              {/* La seule couleur du site qui échappe aux jetons : elle est
                  saisie dans l'administration. L'encre s'en déduit — claire sur
                  fond foncé, foncée sur fond clair — au lieu d'être forcée en
                  blanc, et l'opacité de la description est la plus discrète qui
                  reste au-dessus de 4,5:1. */}
              <header
                className={`px-5 py-4 ${
                  getReadableInk(category.color) === 'light'
                    ? 'text-ink-light'
                    : 'text-ink-dark'
                }`}
                style={{ backgroundColor: category.color }}
              >
                <h3 className="font-heading text-xl font-bold uppercase">
                  {category.name}
                </h3>
                {category.description ? (
                  <p
                    className="mt-1 text-sm"
                    style={{
                      opacity: getSecondaryInkOpacity(
                        category.color,
                        getReadableInk(category.color),
                      ),
                    }}
                  >
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
                          <p className="font-semibold text-price">
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
        <CatalogEmptyState
          onReset={() => {
            setQuery('')
            setCategoryId(null)
          }}
        />
      )}
    </div>
  )
}
