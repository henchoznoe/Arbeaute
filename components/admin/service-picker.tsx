'use client'

import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formControlClass } from '@/components/ui/form-field'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import { formatPrice } from '@/lib/utils/format'

export interface AdminServiceOption {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
  category: { name: string } | null
}

const normalizeSearch = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export const ServicePicker = ({
  services,
  initialServiceId,
  onSelectionChange,
}: Readonly<{
  services: AdminServiceOption[]
  initialServiceId?: string
  onSelectionChange?: (serviceId: string) => void
}>) => {
  const resultsId = useId()
  const [selectedId, setSelectedId] = useState(initialServiceId ?? '')
  const [query, setQuery] = useState('')
  const selected = services.find(service => service.id === selectedId)
  const results = useMemo(() => {
    const normalized = normalizeSearch(query.trim())
    if (!normalized) return services
    return services
      .filter(service =>
        normalizeSearch(
          `${service.name} ${service.category?.name ?? ''}`,
        ).includes(normalized),
      )
      .slice(0, 12)
  }, [query, services])
  const groupedResults = useMemo(() => {
    const groups = new Map<string, AdminServiceOption[]>()
    for (const service of results) {
      const category = service.category?.name ?? 'Sans catégorie'
      groups.set(category, [...(groups.get(category) ?? []), service])
    }
    return [...groups.entries()]
  }, [results])

  const choose = (serviceId: string) => {
    setSelectedId(serviceId)
    setQuery('')
    onSelectionChange?.(serviceId)
  }

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium">Prestation</legend>
      <input type="hidden" name="serviceId" value={selectedId} />
      {selected ? (
        <div className="mt-2 flex min-w-0 items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {formatServiceLabel(selected.name, selected.category?.name)}
            </span>
            <span className="block text-xs text-muted-foreground">
              {selected.durationMinutes} min ·{' '}
              {formatPrice(selected.priceCents)}
            </span>
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Changer de prestation"
            onClick={() => choose('')}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="mt-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Rechercher un soin…"
              aria-label="Rechercher une prestation"
              aria-controls={resultsId}
              className={`${formControlClass} pl-10`}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Recherchez ou ouvrez un groupe pour voir tous les soins.
          </p>
        </div>
      )}

      {!selected ? (
        <div id={resultsId} className="mt-2" aria-live="polite">
          {results.length ? (
            <div className="max-h-80 space-y-1 overflow-y-auto rounded-2xl border bg-background p-2">
              {groupedResults.map(([category, categoryServices]) => (
                <details
                  key={category}
                  open={query.trim() ? true : undefined}
                  className="group rounded-xl open:bg-muted/40"
                >
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                    <span>{category}</span>
                    <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                      {categoryServices.length}
                      <ChevronDown className="size-4 transition group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="pb-1">
                    {categoryServices.map(service => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => choose(service.id)}
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                      >
                        <span className="min-w-0 truncate text-sm font-medium">
                          {service.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {service.durationMinutes} min ·{' '}
                          {formatPrice(service.priceCents)}
                        </span>
                      </button>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-xs font-medium text-destructive">
              Aucune prestation ne correspond à cette recherche.
            </p>
          )}
        </div>
      ) : null}
    </fieldset>
  )
}
