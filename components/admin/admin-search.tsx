'use client'

import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { AppToast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { formControlClass } from '@/components/ui/form-field'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  type AdminSearchActionResult,
  searchAdminAppointments,
} from '@/lib/actions/admin-search'
import type {
  AdminSearchInput,
  AdminSearchPage,
  AdminSearchService,
} from '@/lib/admin/search'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import type {
  AppointmentSource,
  AppointmentStatus,
} from '@/prisma/generated/prisma/enums'

interface SearchFilters {
  query: string
  serviceId: string
  status: '' | AppointmentStatus
  source: '' | AppointmentSource
  from: string
  to: string
}

const EMPTY_FILTERS: SearchFilters = {
  query: '',
  serviceId: '',
  status: '',
  source: '',
  from: '',
  to: '',
}

const statusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: 'Confirmé',
  CANCELLED: 'Annulé',
  COMPLETED: 'Terminé',
  NO_SHOW: 'Absence',
}

const statusVariants = {
  CONFIRMED: 'success',
  CANCELLED: 'neutral',
  COMPLETED: 'info',
  NO_SHOW: 'danger',
} as const

const formatMoment = (date: Date): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: RESERVATION_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))

const toInput = (filters: SearchFilters, page: number): AdminSearchInput => ({
  query: filters.query,
  serviceId: filters.serviceId || undefined,
  status: filters.status || undefined,
  source: filters.source || undefined,
  from: filters.from || undefined,
  to: filters.to || undefined,
  page,
})

export const AdminSearch = ({
  services,
  initialResult,
}: Readonly<{
  services: AdminSearchService[]
  initialResult: AdminSearchPage
}>) => {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(initialResult)
  const [message, setMessage] = useState<string | null>(null)
  const [toastOpen, setToastOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const lastRequest = useRef(JSON.stringify(toInput(EMPTY_FILTERS, 1)))
  const requestId = useRef(0)

  useEffect(() => {
    const signature = JSON.stringify(toInput(filters, page))
    if (lastRequest.current === signature) return
    lastRequest.current = signature
    const timeout = window.setTimeout(() => {
      const currentRequest = requestId.current + 1
      requestId.current = currentRequest
      startTransition(async () => {
        let response: AdminSearchActionResult
        try {
          response = await searchAdminAppointments(toInput(filters, page))
        } catch {
          response = {
            ok: false,
            message: 'La recherche est momentanément indisponible.',
          }
        }
        if (requestId.current !== currentRequest) return
        setMessage(response.message)
        if (response.result) setResult(response.result)
        if (!response.ok) setToastOpen(true)
      })
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [filters, page])

  const updateFilter = <Key extends keyof SearchFilters>(
    key: Key,
    value: SearchFilters[Key],
  ) => {
    setFilters(current => ({ ...current, [key]: value }))
    setPage(1)
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <>
      <section className="mt-6 rounded-3xl border bg-card p-4 shadow-sm sm:p-6">
        <label htmlFor="admin-global-search" className="text-sm font-semibold">
          Cliente
        </label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
          <input
            id="admin-global-search"
            value={filters.query}
            onChange={event => updateFilter('query', event.target.value)}
            placeholder="Nom, email exact ou téléphone complet…"
            autoComplete="off"
            className={`${formControlClass} pr-10 pl-10`}
          />
          {filters.query ? (
            <button
              type="button"
              onClick={() => updateFilter('query', '')}
              aria-label="Effacer la recherche"
              className="absolute top-0 right-0 grid size-11 place-items-center text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          La saisie reste dans cet écran admin et n’est jamais ajoutée à l’URL.
        </p>

        <div className="mt-5 flex items-center gap-2 border-t pt-5">
          <SlidersHorizontal className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Filtres</h2>
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters(EMPTY_FILTERS)
                setPage(1)
              }}
              className="ml-auto"
            >
              Réinitialiser
            </Button>
          ) : null}
        </div>
        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            Prestation
            <select
              value={filters.serviceId}
              onChange={event => updateFilter('serviceId', event.target.value)}
              className={`mt-1 ${formControlClass}`}
            >
              <option value="">Toutes</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {formatServiceLabel(service.name, service.category?.name)}
                  {service.isArchived ? ' · archivée' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            Statut
            <select
              value={filters.status}
              onChange={event =>
                updateFilter(
                  'status',
                  event.target.value as SearchFilters['status'],
                )
              }
              className={`mt-1 ${formControlClass}`}
            >
              <option value="">Tous</option>
              {Object.entries(statusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            Origine
            <select
              value={filters.source}
              onChange={event =>
                updateFilter(
                  'source',
                  event.target.value as SearchFilters['source'],
                )
              }
              className={`mt-1 ${formControlClass}`}
            >
              <option value="">Toutes</option>
              <option value="PUBLIC">Réservation en ligne</option>
              <option value="ADMIN">Ajout manuel</option>
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            Du
            <input
              type="date"
              value={filters.from}
              onChange={event => updateFilter('from', event.target.value)}
              className={`mt-1 ${formControlClass}`}
            />
          </label>
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            Au
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={event => updateFilter('to', event.target.value)}
              className={`mt-1 ${formControlClass}`}
            />
          </label>
        </div>
      </section>

      <section className="mt-6" aria-labelledby="admin-search-results">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div>
            <h2 id="admin-search-results" className="text-lg font-semibold">
              Résultats
            </h2>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {pending
                ? 'Recherche…'
                : `${result.totalCount} rendez-vous · page ${result.page} sur ${result.totalPages}`}
            </p>
          </div>
          {pending ? (
            <span className="size-5 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          ) : null}
        </div>

        {result.appointments.length ? (
          <ol className={`mt-3 space-y-3 ${pending ? 'opacity-60' : ''}`}>
            {result.appointments.map(appointment => (
              <li key={appointment.id}>
                <Link
                  href={`/admin/appointments/${appointment.id}`}
                  className="group block min-w-0 rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold capitalize">
                        <Clock3 className="size-4 shrink-0 text-primary" />
                        {formatMoment(appointment.startsAt)}
                      </p>
                      <p className="mt-2 flex min-w-0 items-center gap-2">
                        <UserRound className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">
                          {[
                            appointment.customerFirstName,
                            appointment.customerLastName,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        </span>
                      </p>
                    </div>
                    <StatusBadge variant={statusVariants[appointment.status]}>
                      {statusLabels[appointment.status]}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 truncate text-sm text-muted-foreground">
                    {formatServiceLabel(
                      appointment.serviceNameSnapshot,
                      appointment.service.category?.name,
                    )}
                  </p>
                  <div className="mt-3 flex min-w-0 items-end justify-between gap-3 border-t pt-3">
                    <div className="min-w-0 text-xs text-muted-foreground">
                      {appointment.customerEmail ? (
                        <p className="truncate">{appointment.customerEmail}</p>
                      ) : null}
                      {appointment.customerPhone ? (
                        <p className="truncate">{appointment.customerPhone}</p>
                      ) : null}
                      <p>
                        {appointment.source === 'PUBLIC'
                          ? 'Réservation en ligne'
                          : 'Ajout manuel'}
                        {appointment.customerId ? ' · cliente liée' : ''}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                      Ouvrir <ChevronRight className="size-4" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="Aucun rendez-vous"
            description="Modifiez la recherche ou élargissez la période sélectionnée."
            className="mt-3"
          />
        )}

        {result.totalPages > 1 ? (
          <nav
            aria-label="Pagination des résultats"
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
