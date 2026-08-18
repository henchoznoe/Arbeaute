'use client'

import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AdminDayTimeline } from '@/components/admin/admin-day-timeline'
import { AdminWeekGrid } from '@/components/admin/admin-week-grid'
import { Button } from '@/components/ui/button'
import type { AdminTimelineDay } from '@/lib/admin/agenda-timeline'
import { ADMIN_AGENDA_DATE_EVENT } from '@/lib/admin/navigation'
import { capitalizeFirst } from '@/lib/utils/format'

interface AdminAgendaViewProps {
  anchor: string
  today: string
  days: AdminTimelineDay[]
  /** Jours de la semaine affichés par la grille, réglés dans « Réglages ». */
  visibleDays: number[]
  previousWeek: string
  nextWeek: string
}

export const AdminAgendaView = ({
  anchor,
  today,
  days,
  visibleDays,
  previousWeek,
  nextWeek,
}: Readonly<AdminAgendaViewProps>) => {
  const [selectedDate, setSelectedDate] = useState(anchor)

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

  // Un réglage vide ou incohérent ne doit jamais rendre une grille sans
  // colonne : on retombe sur la semaine entière.
  const shownIndexes = days.flatMap((day, index) =>
    visibleDays.includes(day.dayOfWeek) ? [index] : [],
  )
  const visibleIndexes = shownIndexes.length
    ? shownIndexes
    : days.map((_, index) => index)
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
              <p className="text-xs font-semibold sm:text-sm">
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
                  <span className="text-2xs uppercase">{day.shortLabel}</span>
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
              <h2 className="font-heading text-2xl font-bold">
                {capitalizeFirst(selectedDay.label)}
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
            <p className="text-sm text-muted-foreground">
              {capitalizeFirst(firstVisibleDay.label)} –{' '}
              {capitalizeFirst(lastVisibleDay.label)}
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

        <AdminWeekGrid days={days} visibleIndexes={visibleIndexes} />

        {visibleIndexes.length < days.length ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {days.length - visibleIndexes.length} jour
            {days.length - visibleIndexes.length > 1 ? 's' : ''} masqué
            {days.length - visibleIndexes.length > 1 ? 's' : ''} dans cette vue.
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-my-1 text-primary"
            >
              <Link href="/admin/settings/agenda">
                <SlidersHorizontal className="size-4" /> Changer les jours
                affichés
              </Link>
            </Button>
          </p>
        ) : null}
      </section>
    </>
  )
}
