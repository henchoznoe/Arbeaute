'use client'

import { Search, UserRoundCheck } from 'lucide-react'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { formControlClass } from '@/components/ui/form-field'
import {
  type AdminCustomerOption,
  searchAdminCustomers,
} from '@/lib/actions/admin-agenda'

export const CustomerPicker = ({
  onSelect,
}: Readonly<{ onSelect: (customer: AdminCustomerOption) => void }>) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminCustomerOption[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const search = () => {
    startTransition(async () => {
      const result = await searchAdminCustomers(query)
      setResults(result.customers)
      setMessage(result.message)
    })
  }

  return (
    <section className="rounded-2xl border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <UserRoundCheck className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">
          Reprendre une cliente existante
        </h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Recherchez par nom, email ou téléphone pour remplir ses coordonnées.
      </p>
      <div className="mt-3 flex min-w-0 gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                search()
              }
            }}
            placeholder="Marie, 079…, email…"
            aria-label="Rechercher une cliente existante"
            className={`${formControlClass} pl-10`}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending || query.trim().length < 2}
          onClick={search}
        >
          {pending ? 'Recherche…' : 'Rechercher'}
        </Button>
      </div>
      {message ? (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
      {results.length ? (
        <div className="mt-2 space-y-1 rounded-xl border bg-background p-2">
          {results.map(customer => (
            <button
              key={customer.id}
              type="button"
              onClick={() => {
                onSelect(customer)
                setResults([])
                setMessage(
                  `${[customer.firstName, customer.lastName].filter(Boolean).join(' ')} sélectionnée.`,
                )
              }}
              className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {[customer.firstName, customer.lastName]
                    .filter(Boolean)
                    .join(' ')}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {customer.email}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {customer.phone}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
