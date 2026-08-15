'use client'

import { Check, Search, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formControlClass } from '@/components/ui/form-field'
import { formatServiceLabel } from '@/lib/reservation/service-label'

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
  onSelectionChange?: () => void
}>) => {
  const resultsId = useId()
  const [selectedId, setSelectedId] = useState(initialServiceId ?? '')
  const [query, setQuery] = useState('')
  const selected = services.find(service => service.id === selectedId)
  const results = useMemo(() => {
    const normalized = normalizeSearch(query.trim())
    if (normalized.length < 2) return []
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
    onSelectionChange?.()
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
              {(selected.priceCents / 100).toLocaleString('fr-CH')} CHF
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
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Nom ou catégorie…"
            aria-label="Rechercher une prestation"
            aria-controls={resultsId}
            className={`${formControlClass} pl-10`}
          />
        </div>
      )}

      {!selected ? (
        <div id={resultsId} className="mt-2" aria-live="polite">
          {query.trim().length < 2 ? (
            <p className="text-xs text-muted-foreground">
              Saisissez au moins deux caractères pour afficher les prestations.
            </p>
          ) : results.length ? (
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-2xl border bg-background p-2">
              {groupedResults.map(([category, categoryServices]) => (
                <section key={category} aria-label={category}>
                  <h3 className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {category}
                  </h3>
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
                        {(service.priceCents / 100).toLocaleString('fr-CH')} CHF
                      </span>
                    </button>
                  ))}
                </section>
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
