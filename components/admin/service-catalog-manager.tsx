'use client'

import {
  ArrowDownUp,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ServiceCategoryPanel } from '@/components/admin/service-category-panel'
import { ServiceRowActions } from '@/components/admin/service-row-actions'
import { Button } from '@/components/ui/button'
import { formControlClass } from '@/components/ui/form-field'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  moveCategory,
  moveService,
  toggleCategory,
} from '@/lib/actions/catalog'
import { formatPrice } from '@/lib/utils/format'

interface CatalogService {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
  color: string
  isVisible: boolean
  isBookable: boolean
  isArchived: boolean
}

export interface CatalogCategory {
  id: string
  name: string
  description: string | null
  color: string
  isActive: boolean
  services: CatalogService[]
}

const normalizeSearch = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export const ServiceCatalogManager = ({
  categories,
}: Readonly<{ categories: CatalogCategory[] }>) => {
  const [query, setQuery] = useState('')
  const [ordering, setOrdering] = useState(false)
  const normalizedQuery = normalizeSearch(query.trim())
  const visibleCategories = useMemo(
    () =>
      categories.flatMap(category => {
        if (!normalizedQuery) return [category]
        const categoryMatches = normalizeSearch(
          `${category.name} ${category.description ?? ''}`,
        ).includes(normalizedQuery)
        const services = categoryMatches
          ? category.services
          : category.services.filter(service =>
              normalizeSearch(service.name).includes(normalizedQuery),
            )
        return services.length ? [{ ...category, services }] : []
      }),
    [categories, normalizedQuery],
  )
  const resultCount = visibleCategories.reduce(
    (total, category) => total + category.services.length,
    0,
  )

  return (
    <>
      <div className="mt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Rechercher un soin ou un groupe…"
            aria-label="Rechercher une prestation ou un groupe"
            className={`${formControlClass} pl-10`}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {normalizedQuery
            ? `${resultCount} prestation${resultCount > 1 ? 's' : ''} trouvée${resultCount > 1 ? 's' : ''}`
            : `${resultCount} prestations dans ${categories.length} groupes`}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/admin/services/new">
            <Plus className="size-4" /> Nouvelle prestation
          </Link>
        </Button>
        <ServiceCategoryPanel />
        <Button
          type="button"
          variant={ordering ? 'secondary' : 'outline'}
          aria-pressed={ordering}
          onClick={() => setOrdering(value => !value)}
        >
          {ordering ? (
            <Check className="size-4" />
          ) : (
            <ArrowDownUp className="size-4" />
          )}
          {ordering ? 'Terminer' : 'Changer l’ordre'}
        </Button>
      </div>

      {visibleCategories.length ? (
        <div className="mt-4 space-y-3">
          {visibleCategories.map(category => {
            const categoryIndex = categories.findIndex(
              item => item.id === category.id,
            )
            return (
              <details
                key={category.id}
                open={normalizedQuery ? true : undefined}
                className="group overflow-hidden rounded-2xl border bg-card shadow-sm"
              >
                <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span
                    className="size-4 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {category.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {category.services.length} prestation
                      {category.services.length > 1 ? 's' : ''}
                    </span>
                  </span>
                  <ChevronDown className="size-5 shrink-0 text-muted-foreground transition group-open:rotate-180 md:hidden" />
                </summary>

                <div className="hidden border-t group-open:block md:block">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 px-3 py-2">
                    <ServiceCategoryPanel
                      category={{
                        id: category.id,
                        name: category.name,
                        description: category.description,
                        color: category.color,
                      }}
                    />
                    {ordering ? (
                      <div className="flex gap-1">
                        <form action={moveCategory}>
                          <input type="hidden" name="id" value={category.id} />
                          <input type="hidden" name="direction" value="up" />
                          <SubmitButton
                            disabled={categoryIndex === 0}
                            aria-label={`Monter le groupe ${category.name}`}
                            variant="secondary"
                            size="icon"
                          >
                            <ChevronUp className="size-4" />
                          </SubmitButton>
                        </form>
                        <form action={moveCategory}>
                          <input type="hidden" name="id" value={category.id} />
                          <input type="hidden" name="direction" value="down" />
                          <SubmitButton
                            disabled={categoryIndex === categories.length - 1}
                            aria-label={`Descendre le groupe ${category.name}`}
                            variant="secondary"
                            size="icon"
                          >
                            <ChevronDown className="size-4" />
                          </SubmitButton>
                        </form>
                      </div>
                    ) : null}
                  </div>

                  <div className="divide-y">
                    {category.services.map(service => {
                      const originalCategory = categories.find(
                        item => item.id === category.id,
                      )
                      const serviceIndex = originalCategory?.services.findIndex(
                        item => item.id === service.id,
                      )
                      return (
                        <div
                          key={service.id}
                          className={`flex items-center gap-2 px-3 py-2 ${service.isArchived ? 'opacity-50' : ''}`}
                        >
                          <Link
                            href={`/admin/services/${service.id}`}
                            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1.5 transition hover:bg-muted"
                          >
                            <span
                              className="size-3 shrink-0 rounded-full"
                              style={{ backgroundColor: service.color }}
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {service.name}
                              </span>
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {service.isVisible ? (
                                  <Eye className="size-3.5 shrink-0" />
                                ) : (
                                  <EyeOff className="size-3.5 shrink-0" />
                                )}
                                <span className="truncate">
                                  {service.durationMinutes} min ·{' '}
                                  {formatPrice(service.priceCents)}
                                  {service.isBookable
                                    ? ''
                                    : ' · non réservable'}
                                </span>
                              </span>
                            </span>
                          </Link>
                          {ordering ? (
                            <div className="flex gap-1">
                              <form action={moveService}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={service.id}
                                />
                                <input
                                  type="hidden"
                                  name="direction"
                                  value="up"
                                />
                                <SubmitButton
                                  disabled={serviceIndex === 0}
                                  aria-label={`Monter ${service.name}`}
                                  variant="ghost"
                                  size="icon"
                                >
                                  <ChevronUp className="size-4" />
                                </SubmitButton>
                              </form>
                              <form action={moveService}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={service.id}
                                />
                                <input
                                  type="hidden"
                                  name="direction"
                                  value="down"
                                />
                                <SubmitButton
                                  disabled={
                                    serviceIndex ===
                                    (originalCategory?.services.length ?? 0) - 1
                                  }
                                  aria-label={`Descendre ${service.name}`}
                                  variant="ghost"
                                  size="icon"
                                >
                                  <ChevronDown className="size-4" />
                                </SubmitButton>
                              </form>
                            </div>
                          ) : null}
                          <ServiceRowActions
                            id={service.id}
                            name={service.name}
                            isArchived={service.isArchived}
                          />
                        </div>
                      )
                    })}
                  </div>

                  <form
                    action={toggleCategory}
                    className="border-t p-3 text-right"
                  >
                    <input type="hidden" name="id" value={category.id} />
                    <SubmitButton
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                    >
                      {category.isActive
                        ? 'Désactiver le groupe'
                        : 'Réactiver le groupe'}
                    </SubmitButton>
                  </form>
                </div>
              </details>
            )
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
          Aucune prestation ne correspond à cette recherche.
        </p>
      )}
    </>
  )
}
