'use client'

import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { CustomerCallButton } from '@/components/admin/customer-call-button'
import { AppToast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FormField, formControlClass } from '@/components/ui/form-field'
import {
  type AdminCustomerSearchActionResult,
  searchAdminCustomerPage,
} from '@/lib/actions/admin-search'
import type { AdminCustomerSearchPage } from '@/lib/admin/customer-search'
import { formatDayDate } from '@/lib/reservation/time'

/**
 * Retrouver quelqu'un, le geste le plus fréquent de l'administration.
 *
 * L'écran cherchait des rendez-vous : il fallait déjà savoir quand la personne
 * était venue pour la retrouver. On cherche ici la personne, et une recherche
 * vide affiche les derniers clients vus — utile avant même d'avoir tapé une
 * lettre.
 */
export const AdminCustomerSearch = ({
  initialResult,
}: Readonly<{ initialResult: AdminCustomerSearchPage }>) => {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(initialResult)
  const [message, setMessage] = useState<string | null>(null)
  const [toastOpen, setToastOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const lastRequest = useRef(JSON.stringify({ query: '', page: 1 }))
  const requestId = useRef(0)

  useEffect(() => {
    const signature = JSON.stringify({ query, page })
    if (lastRequest.current === signature) return
    lastRequest.current = signature
    const timeout = window.setTimeout(() => {
      const currentRequest = requestId.current + 1
      requestId.current = currentRequest
      startTransition(async () => {
        let response: AdminCustomerSearchActionResult
        try {
          response = await searchAdminCustomerPage({ query, page })
        } catch {
          response = {
            ok: false,
            message: 'La recherche est momentanément indisponible.',
          }
        }
        // Une réponse dépassée ne doit pas écraser la suivante.
        if (requestId.current !== currentRequest) return
        setMessage(response.message)
        if (response.result) setResult(response.result)
        if (!response.ok) setToastOpen(true)
      })
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [query, page])

  return (
    <>
      <section className="mt-6 rounded-3xl border bg-card p-4 shadow-sm sm:p-6">
        <FormField controlId="admin-customer-search" label="Chercher un client">
          <div className="relative">
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
            <input
              id="admin-customer-search"
              value={query}
              onChange={event => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Nom, e-mail ou téléphone…"
              autoComplete="off"
              className={`${formControlClass} pr-10 pl-10`}
            />
            {query ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setQuery('')
                  setPage(1)
                }}
                aria-label="Effacer la recherche"
                className="absolute top-0 right-0 text-muted-foreground"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </FormField>
        <p className="mt-2 text-xs text-muted-foreground">
          {query
            ? 'La saisie reste dans cet écran et n’est jamais ajoutée à l’adresse de la page.'
            : 'Sans recherche, voici les personnes vues le plus récemment.'}
        </p>
      </section>

      <section className="mt-6" aria-labelledby="admin-customer-results">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div>
            <h2 id="admin-customer-results" className="text-lg font-semibold">
              {query ? 'Résultats' : 'Vus récemment'}
            </h2>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {pending
                ? 'Recherche…'
                : `${result.totalCount} client${result.totalCount > 1 ? 's' : ''} · page ${result.page} sur ${result.totalPages}`}
            </p>
          </div>
          {pending ? (
            <span className="size-5 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          ) : null}
        </div>

        {result.customers.length ? (
          <ol className={`mt-3 space-y-3 ${pending ? 'opacity-60' : ''}`}>
            {result.customers.map(customer => (
              <li key={customer.id}>
                <article className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {[customer.firstName, customer.lastName]
                          .filter(Boolean)
                          .join(' ') || 'Sans nom'}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {customer.email}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="size-4" />
                      {customer._count.appointments} rendez-vous
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Dernière activité le {formatDayDate(customer.lastSeenAt)}
                  </p>
                  <div className="mt-3 grid gap-2 border-t pt-3 sm:flex sm:justify-end">
                    <CustomerCallButton
                      phone={customer.phone}
                      customerName={customer.lastName}
                    />
                    <Button asChild>
                      <Link href={`/admin/customers/${customer.id}`}>
                        Ouvrir <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="Aucun client"
            description="Essayez une autre orthographe, l’adresse e-mail complète, ou quelques chiffres du numéro."
            className="mt-3"
          />
        )}

        {result.totalPages > 1 ? (
          <nav
            aria-label="Pagination des clients"
            className="mt-5 grid grid-cols-2 gap-3"
          >
            <Button
              type="button"
              variant="outline"
              disabled={pending || result.page <= 1}
              onClick={() => setPage(current => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-4" /> Précédent
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || result.page >= result.totalPages}
              onClick={() =>
                setPage(current => Math.min(result.totalPages, current + 1))
              }
            >
              Suivant <ChevronRight className="size-4" />
            </Button>
          </nav>
        ) : null}
      </section>

      <AppToast
        open={toastOpen}
        onOpenChange={setToastOpen}
        title="Recherche impossible"
        description={message ?? undefined}
        variant="danger"
      />
    </>
  )
}
