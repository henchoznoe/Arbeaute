'use client'

import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode, useEffect, useState } from 'react'

const STORAGE_KEY = 'admin-agenda-visible-days'
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0]

interface AgendaDayOption {
  dayOfWeek: number
  label: string
  shortLabel: string
  appointmentCount: number
}

interface AdminAgendaViewProps {
  anchor: string
  today: string
  days: AgendaDayOption[]
  mobileDays: ReactNode[]
  desktopDays: ReactNode[]
  previousWeek: string
  nextWeek: string
}

const isStoredDays = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(day => Number.isInteger(day) && day >= 0 && day <= 6)

const storeDays = (days: number[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(days))
  } catch {
    // Le stockage peut être désactivé : le sélecteur reste utilisable pour la session.
  }
}

export const AdminAgendaView = ({
  anchor,
  today,
  days,
  mobileDays,
  desktopDays,
  previousWeek,
  nextWeek,
}: Readonly<AdminAgendaViewProps>) => {
  const [visibleDays, setVisibleDays] = useState(ALL_DAYS)

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY)
      if (!storedValue) return
      const storedDays: unknown = JSON.parse(storedValue)
      if (isStoredDays(storedDays)) setVisibleDays(storedDays)
    } catch {
      // Une préférence invalide ne doit jamais bloquer l'agenda.
    }
  }, [])

  const toggleDay = (dayOfWeek: number) => {
    setVisibleDays(currentDays => {
      const isVisible = currentDays.includes(dayOfWeek)
      if (isVisible && currentDays.length === 1) return currentDays

      const nextDays = isVisible
        ? currentDays.filter(day => day !== dayOfWeek)
        : ALL_DAYS.filter(day => currentDays.includes(day) || day === dayOfWeek)
      storeDays(nextDays)
      return nextDays
    })
  }

  const showAllDays = () => {
    setVisibleDays(ALL_DAYS)
    storeDays(ALL_DAYS)
  }

  const visibleIndexes = days.flatMap((day, index) =>
    visibleDays.includes(day.dayOfWeek) ? [index] : [],
  )
  const firstVisibleDay = days[visibleIndexes[0]]
  const lastVisibleDay = days[visibleIndexes.at(-1) as number]

  return (
    <>
      <section className="mt-4 md:hidden">
        <div className="rounded-2xl border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/admin?date=${previousWeek}`}
              aria-label="Semaine précédente"
              className="grid size-11 place-items-center rounded-xl hover:bg-muted"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <div className="text-center">
              <p className="font-semibold">Semaine</p>
              <p className="text-xs capitalize text-muted-foreground">
                {firstVisibleDay.label} – {lastVisibleDay.label}
              </p>
            </div>
            <Link
              href={`/admin?date=${nextWeek}`}
              aria-label="Semaine suivante"
              className="grid size-11 place-items-center rounded-xl hover:bg-muted"
            >
              <ChevronRight className="size-5" />
            </Link>
          </div>
          {anchor !== today ? (
            <Link
              href="/admin"
              className="mt-2 flex min-h-10 items-center justify-center gap-2 rounded-xl bg-muted px-3 text-sm font-medium"
            >
              <CalendarClock className="size-4" /> Revenir à aujourd’hui
            </Link>
          ) : null}
        </div>

        <div className="mt-4 space-y-4">
          {visibleIndexes.map(index => mobileDays[index])}
        </div>
      </section>

      <section className="mt-7 hidden md:block">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">Semaine</h2>
            <p className="text-sm capitalize text-muted-foreground">
              {firstVisibleDay.label} – {lastVisibleDay.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin?date=${previousWeek}`}
              aria-label="Semaine précédente"
              className="grid size-10 place-items-center rounded-xl border"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium"
            >
              <CalendarClock className="size-4" /> Aujourd’hui
            </Link>
            <Link
              href={`/admin?date=${nextWeek}`}
              aria-label="Semaine suivante"
              className="grid size-10 place-items-center rounded-xl border"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>

        <div
          className="mt-4 grid overflow-hidden rounded-2xl border bg-card"
          style={{
            gridTemplateColumns: `repeat(${visibleIndexes.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleIndexes.map(index => desktopDays[index])}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Jours affichés</h2>
            <p className="text-xs text-muted-foreground">
              Appuie sur un jour pour le masquer ou l’afficher.
            </p>
          </div>
          {visibleDays.length < ALL_DAYS.length ? (
            <button
              type="button"
              onClick={showAllDays}
              className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-medium text-primary hover:bg-muted"
            >
              Tout afficher
            </button>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5 sm:max-w-xl">
          {days.map(day => {
            const isVisible = visibleDays.includes(day.dayOfWeek)
            return (
              <button
                key={day.dayOfWeek}
                type="button"
                aria-label={`${isVisible ? 'Masquer' : 'Afficher'} ${day.label}${day.appointmentCount ? `, ${day.appointmentCount} rendez-vous` : ''}`}
                aria-pressed={isVisible}
                onClick={() => toggleDay(day.dayOfWeek)}
                disabled={isVisible && visibleDays.length === 1}
                className={`relative grid min-h-11 place-items-center rounded-xl border text-xs font-semibold transition disabled:cursor-not-allowed ${isVisible ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
              >
                {day.shortLabel}
                {day.appointmentCount > 0 ? (
                  <span
                    className={`hidden md:absolute right-1 top-1 md:grid size-4 place-items-center rounded-full text-[9px] ${isVisible ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'}`}
                    aria-hidden="true"
                  >
                    {day.appointmentCount}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </section>
    </>
  )
}
