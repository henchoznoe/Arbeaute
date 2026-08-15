'use client'

import { CalendarClock, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode, useEffect, useState } from 'react'
import { AdminDayTimeline } from '@/components/admin/admin-day-timeline'
import { Button } from '@/components/ui/button'
import type { AdminTimelineDay } from '@/lib/admin/agenda-timeline'
import { ADMIN_AGENDA_DATE_EVENT } from '@/lib/admin/navigation'

const STORAGE_KEY = 'admin-agenda-visible-days'
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0]

interface AdminAgendaViewProps {
  anchor: string
  today: string
  days: AdminTimelineDay[]
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
  desktopDays,
  previousWeek,
  nextWeek,
}: Readonly<AdminAgendaViewProps>) => {
  const [visibleDays, setVisibleDays] = useState(ALL_DAYS)
  const [selectedDate, setSelectedDate] = useState(anchor)

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

  useEffect(() => setSelectedDate(anchor), [anchor])

  const selectDate = (dateKey: string) => {
    setSelectedDate(dateKey)
    const url = new URL(window.location.href)
    url.searchParams.set('date', dateKey)
    window.history.replaceState(window.history.state, '', url)
    window.dispatchEvent(
      new CustomEvent(ADMIN_AGENDA_DATE_EVENT, { detail: dateKey }),
    )
  }

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
  const selectedDay = days.find(day => day.dateKey === selectedDate) ?? days[0]

  return (
    <>
      <section className="mt-4 md:hidden">
        <div className="rounded-2xl border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <Button asChild variant="ghost" size="icon">
              <Link
                href={`/admin?date=${previousWeek}`}
                aria-label="Semaine précédente"
              >
                <ChevronLeft className="size-5" />
              </Link>
            </Button>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Semaine
              </p>
              <p className="text-xs font-semibold capitalize sm:text-sm">
                {days[0].label.replace(/^\S+\s/, '')} –{' '}
                {days.at(-1)?.label.replace(/^\S+\s/, '')}
              </p>
            </div>
            <Button asChild variant="ghost" size="icon">
              <Link
                href={`/admin?date=${nextWeek}`}
                aria-label="Semaine suivante"
              >
                <ChevronRight className="size-5" />
              </Link>
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1" role="tablist">
            {days.map(day => {
              const isSelected = day.dateKey === selectedDay.dateKey
              return (
                <button
                  key={day.dateKey}
                  id={`admin-day-tab-${day.dateKey}`}
                  type="button"
                  role="tab"
                  aria-controls="admin-day-panel"
                  aria-selected={isSelected}
                  aria-label={`${day.label}${day.appointments.length ? `, ${day.appointments.length} rendez-vous` : ''}`}
                  onClick={() => selectDate(day.dateKey)}
                  className={`relative flex min-h-14 flex-col items-center justify-center rounded-xl text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : day.isToday
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="text-[10px] uppercase">
                    {day.shortLabel}
                  </span>
                  <span className="mt-0.5 text-sm">{day.dayNumber}</span>
                  {day.appointments.length > 0 ? (
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-1 size-1 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-brand'}`}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>

          {selectedDay.dateKey !== today ? (
            <Button asChild variant="secondary" className="mt-2 w-full">
              <Link href="/admin">
                <CalendarClock className="size-4" /> Revenir à aujourd’hui
              </Link>
            </Button>
          ) : null}
        </div>

        <div
          id="admin-day-panel"
          role="tabpanel"
          aria-labelledby={`admin-day-tab-${selectedDay.dateKey}`}
        >
          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-brand">
                {selectedDay.isToday ? 'Aujourd’hui' : 'Journée sélectionnée'}
              </p>
              <h2 className="font-heading text-2xl font-bold capitalize">
                {selectedDay.label}
              </h2>
            </div>
            <Button asChild size="icon">
              <Link
                href={`/admin/appointments/new?date=${selectedDay.dateKey}`}
                aria-label={`Ajouter un rendez-vous le ${selectedDay.label}`}
              >
                <Plus className="size-5" />
              </Link>
            </Button>
          </div>
          <AdminDayTimeline day={selectedDay} />
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
            <Button asChild variant="outline" size="icon">
              <Link
                href={`/admin?date=${previousWeek}`}
                aria-label="Semaine précédente"
              >
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">
                <CalendarClock className="size-4" /> Aujourd’hui
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon">
              <Link
                href={`/admin?date=${nextWeek}`}
                aria-label="Semaine suivante"
              >
                <ChevronRight className="size-4" />
              </Link>
            </Button>
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

      <section className="mt-6 hidden rounded-2xl border bg-card p-3 sm:p-4 md:block">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Jours affichés</h2>
            <p className="text-xs text-muted-foreground">
              Appuie sur un jour pour le masquer ou l’afficher.
            </p>
          </div>
          {visibleDays.length < ALL_DAYS.length ? (
            <Button
              type="button"
              variant="ghost"
              onClick={showAllDays}
              className="shrink-0 text-primary"
            >
              Tout afficher
            </Button>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5 sm:max-w-xl">
          {days.map(day => {
            const isVisible = visibleDays.includes(day.dayOfWeek)
            return (
              <button
                key={day.dayOfWeek}
                type="button"
                aria-label={`${isVisible ? 'Masquer' : 'Afficher'} ${day.label}${day.appointments.length ? `, ${day.appointments.length} rendez-vous` : ''}`}
                aria-pressed={isVisible}
                onClick={() => toggleDay(day.dayOfWeek)}
                disabled={isVisible && visibleDays.length === 1}
                className={`relative grid min-h-11 place-items-center rounded-xl border text-xs font-semibold transition disabled:cursor-not-allowed ${isVisible ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
              >
                {day.shortLabel}
                {day.appointments.length > 0 ? (
                  <span
                    className={`absolute right-1 top-1 grid size-4 place-items-center rounded-full text-[9px] ${isVisible ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'}`}
                    aria-hidden="true"
                  >
                    {day.appointments.length}
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
