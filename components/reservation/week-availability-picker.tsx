'use client'

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Minus,
  Phone,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { contact } from '@/lib/constants/contact'
import type {
  AvailabilityDayState,
  DayAvailability,
} from '@/lib/reservation/availability'
import {
  availabilityStateLabels,
  formatCalendarDate,
  formatCalendarDayNumber,
  formatCalendarPeriod,
  formatCalendarWeekday,
} from '@/lib/reservation/calendar-view'
import { addLocalDays } from '@/lib/reservation/time'
import { cn } from '@/lib/utils/cn'

interface WeekAvailabilityPickerProps {
  announcement: string
  availability: Record<string, DayAvailability>
  date: string
  loading: boolean
  maxDate: string
  minDate: string
  onChangeWeek: (amount: number) => void
  onSelectDate: (dateKey: string) => void
  onSelectSlot: (startsAt: string) => void
  ready: boolean
  startsAt: string
  viewStart: string
}

const stateIcon = {
  AVAILABLE: CircleCheck,
  ON_REQUEST: Phone,
  FULL: X,
  CLOSED: Minus,
} satisfies Record<AvailabilityDayState, typeof CircleCheck>

export const WeekAvailabilityPicker = ({
  announcement,
  availability,
  date,
  loading,
  maxDate,
  minDate,
  onChangeWeek,
  onSelectDate,
  onSelectSlot,
  ready,
  startsAt,
  viewStart,
}: Readonly<WeekAvailabilityPickerProps>) => {
  const weekEnd = addLocalDays(viewStart, 6)
  const weekDates = Array.from({ length: 7 }, (_, index) =>
    addLocalDays(viewStart, index),
  )
  const lastCompleteWeekStart = addLocalDays(maxDate, -6)
  const maxViewStart =
    lastCompleteWeekStart < minDate ? minDate : lastCompleteWeekStart
  const selectedDay = availability[date]
  const slots = selectedDay?.slots ?? []
  // Une même journée peut porter les deux natures d'heures : proposer une
  // heure sur demande comme un bouton de réservation mènerait la personne
  // jusqu'à la dernière étape pour un refus.
  const openSlots = slots.filter(slot => slot.state === 'OPEN')
  const requestSlots = slots.filter(slot => slot.state === 'ON_REQUEST')

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <div className="-mx-3 mt-6 rounded-2xl border bg-muted/25 p-2 sm:mx-0 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onChangeWeek(-7)}
            disabled={viewStart <= minDate}
            aria-label="Période précédente"
            className="rounded-full"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="flex min-w-0 items-center gap-2 text-center text-sm font-semibold sm:text-base">
            <CalendarDays className="hidden size-4 shrink-0 sm:block" />
            {formatCalendarPeriod(viewStart, weekEnd)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onChangeWeek(7)}
            disabled={viewStart >= maxViewStart}
            aria-label="Période suivante"
            className="rounded-full"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-px sm:gap-2">
          {weekDates.map(dateKey => {
            const state = ready
              ? (availability[dateKey]?.state ?? 'CLOSED')
              : null
            const StateIcon = state ? stateIcon[state] : null
            const selected = date === dateKey
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => onSelectDate(dateKey)}
                disabled={!ready}
                aria-pressed={selected}
                aria-label={`${formatCalendarDate(dateKey)}${
                  state ? ` — ${availabilityStateLabels[state]}` : ''
                }`}
                className={cn(
                  'flex min-h-20 min-w-0 flex-col items-center justify-center rounded-xl border bg-background px-0.5 py-2 text-center transition disabled:opacity-50',
                  selected &&
                    'border-primary bg-primary text-primary-foreground ring-2 ring-primary/20',
                  !selected &&
                    state === 'AVAILABLE' &&
                    'border-success-accent text-success-strong hover:border-primary',
                  !selected &&
                    state === 'ON_REQUEST' &&
                    'border-primary/40 bg-primary/10 text-primary hover:border-primary',
                  !selected &&
                    state === 'FULL' &&
                    'border-warning-accent bg-warning-subtle text-warning-strong',
                  !selected &&
                    state === 'CLOSED' &&
                    'border-dashed bg-muted text-muted-foreground',
                )}
              >
                <span className="text-2xs leading-none font-semibold uppercase sm:text-xs">
                  {formatCalendarWeekday(dateKey)}
                </span>
                <span className="mt-1 text-lg leading-none font-bold sm:text-xl">
                  {formatCalendarDayNumber(dateKey)}
                </span>
                <span className="mt-1.5 flex min-w-0 items-center justify-center gap-0.5 text-2xs leading-none font-semibold">
                  {StateIcon ? <StateIcon className="size-3 shrink-0" /> : null}
                  {/* La pastille est étroite : le nom complet de l'état vit
                      dans l'aria-label, jamais tronqué. */}
                  {state === 'AVAILABLE'
                    ? 'Libre'
                    : state === 'ON_REQUEST'
                      ? 'Demande'
                      : state === 'FULL'
                        ? 'Complet'
                        : state === 'CLOSED'
                          ? 'Fermé'
                          : '…'}
                </span>
              </button>
            )
          })}
        </div>

        <ul
          className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground sm:text-xs"
          aria-label="Légende des disponibilités"
        >
          <li className="flex items-center gap-1">
            <CircleCheck className="size-3.5 text-success" />
            Disponible
          </li>
          <li className="flex items-center gap-1">
            <Phone className="size-3.5 text-primary" /> Sur demande
          </li>
          <li className="flex items-center gap-1">
            <X className="size-3.5 text-warning-strong" /> Complet
          </li>
          <li className="flex items-center gap-1">
            <Minus className="size-3.5" /> Fermé
          </li>
        </ul>
      </div>

      <div className="mt-6">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Clock className="size-4" /> Heures disponibles
        </p>
        {loading || !ready ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Recherche des créneaux…
          </p>
        ) : slots.length > 0 ? (
          <>
            {openSlots.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {openSlots.map(slot => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    onClick={() => onSelectSlot(slot.startsAt)}
                    className={cn(
                      'h-11 rounded-xl border text-sm font-medium',
                      startsAt === slot.startsAt
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-background hover:border-primary',
                    )}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            ) : null}
            {requestSlots.length > 0 ? (
              <div className={openSlots.length > 0 ? 'mt-6' : 'mt-3'}>
                {openSlots.length > 0 ? (
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="size-4" /> Trop tard pour réserver en
                    ligne
                  </p>
                ) : null}
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {requestSlots.map(slot => (
                    <button
                      key={slot.startsAt}
                      type="button"
                      onClick={() => onSelectSlot(slot.startsAt)}
                      className={cn(
                        'h-11 rounded-xl border text-sm font-medium',
                        startsAt === slot.startsAt
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-primary/30 bg-primary/5 text-primary hover:border-primary',
                      )}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Ces heures sont encore libres, mais il est trop tard pour les
                  réserver en ligne. Demandez-en une à {contact.owner} : elle
                  vous répond, ou appelez directement.
                </p>
                <Button
                  asChild
                  variant="secondary"
                  className="mt-3 w-full sm:w-auto"
                >
                  <a href={`tel:${contact.phoneRaw}`}>
                    <Phone className="size-4 shrink-0" />
                    Appeler le {contact.phone}
                  </a>
                </Button>
              </div>
            ) : null}
          </>
        ) : selectedDay?.state === 'FULL' ? (
          <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Tous les créneaux de ce jour sont déjà pris. Essayez une autre date
            ou recherchez le prochain créneau.
          </p>
        ) : (
          <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            L’institut est fermé ce jour-là. Choisissez une date indiquée comme
            disponible.
          </p>
        )}
      </div>
    </>
  )
}
