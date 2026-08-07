import { formatInTimeZone } from 'date-fns-tz'
import { Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  createAvailabilityException,
  createWeeklyAvailability,
  deleteAvailabilityException,
  deleteWeeklyAvailability,
} from '@/lib/actions/admin-agenda'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { getLocalDateKey } from '@/lib/reservation/time'

const days = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
]

const minuteLabel = (minute: number) =>
  `${Math.floor(minute / 60)
    .toString()
    .padStart(2, '0')}:${(minute % 60).toString().padStart(2, '0')}`

const fieldClass =
  'h-11 min-w-0 rounded-xl border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring sm:text-sm'

const errorMessages: Record<string, string> = {
  'invalid-range': 'La plage horaire est invalide.',
  'overlap-range': 'Cette plage chevauche un horaire existant.',
  'invalid-exception': 'L’exception saisie est invalide.',
}

interface AvailabilityPageProps {
  searchParams: Promise<{ error?: string }>
}

const AvailabilityPage = async ({
  searchParams,
}: Readonly<AvailabilityPageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { error } = await searchParams
  const [weekly, exceptions] = await Promise.all([
    prisma.weeklyAvailability.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    }),
    prisma.availabilityException.findMany({
      where: {
        endsAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { startsAt: 'asc' },
    }),
  ])

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-8">
      <header>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground"
        >
          ← Agenda
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-bold">
          Horaires et exceptions
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Les horaires définissent les créneaux publics. Une ouverture
          exceptionnelle ajoute une plage ; une fermeture la bloque.
        </p>
      </header>

      {error && errorMessages[error] ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
        >
          {errorMessages[error]}
        </p>
      ) : null}

      <section className="mt-8 rounded-3xl border bg-card p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Horaires hebdomadaires</h2>
        <div className="mt-5 divide-y rounded-2xl border">
          {days.map(day => {
            const ranges = weekly.filter(range => range.dayOfWeek === day.value)
            return (
              <div
                key={day.value}
                className="grid gap-3 p-4 sm:grid-cols-[8rem_1fr]"
              >
                <p className="font-medium">{day.label}</p>
                <div className="flex flex-wrap gap-2">
                  {ranges.length ? (
                    ranges.map(range => (
                      <form
                        key={range.id}
                        action={deleteWeeklyAvailability}
                        className="flex min-h-11 items-center gap-2 rounded-xl bg-muted px-3 text-sm"
                      >
                        <input type="hidden" name="id" value={range.id} />
                        <span>
                          {minuteLabel(range.startMinute)}–
                          {minuteLabel(range.endMinute)}
                        </span>
                        <button
                          type="submit"
                          aria-label={`Supprimer l’horaire du ${day.label}`}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-background"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    ))
                  ) : (
                    <span className="py-2 text-sm text-muted-foreground">
                      Fermé
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <form
          action={createWeeklyAvailability}
          className="mt-5 grid gap-3 sm:grid-cols-[1.3fr_1fr_1fr_auto]"
        >
          <label className="grid gap-1.5 text-sm font-medium">
            Jour
            <select name="dayOfWeek" className={fieldClass}>
              {days.map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Début
            <input
              name="startTime"
              type="time"
              step={900}
              defaultValue="08:00"
              required
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Fin
            <input
              name="endTime"
              type="time"
              step={900}
              defaultValue="11:30"
              required
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            <Plus className="size-4" /> Ajouter
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-3xl border bg-card p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Exceptions</h2>
        <form
          action={createAvailabilityException}
          className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-[1.1fr_1fr_0.8fr_0.8fr_1.5fr_auto]"
        >
          <label className="grid gap-1.5 text-sm font-medium">
            Type
            <select name="type" className={fieldClass}>
              <option value="UNAVAILABLE">Fermeture</option>
              <option value="AVAILABLE">Ouverture</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Date
            <input
              name="date"
              type="date"
              defaultValue={getLocalDateKey(new Date())}
              required
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Début
            <input
              name="startTime"
              type="time"
              step={900}
              defaultValue="08:00"
              required
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Fin
            <input
              name="endTime"
              type="time"
              step={900}
              defaultValue="12:00"
              required
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Motif
            <input
              name="label"
              maxLength={120}
              placeholder="Vacances, ouverture…"
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            <Plus className="size-4" /> Ajouter
          </button>
        </form>

        <div className="mt-6 space-y-2">
          {exceptions.length ? (
            exceptions.map(exception => (
              <div
                key={exception.id}
                className="flex min-h-14 flex-wrap items-center gap-3 rounded-xl border px-4 py-2"
              >
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${exception.type === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-950'}`}
                >
                  {exception.type === 'AVAILABLE' ? 'Ouverture' : 'Fermeture'}
                </span>
                <p className="min-w-44 flex-1 text-sm">
                  <span className="font-medium">
                    {formatInTimeZone(
                      exception.startsAt,
                      RESERVATION_TIME_ZONE,
                      'dd.MM.yyyy · HH:mm',
                    )}
                    –
                    {formatInTimeZone(
                      exception.endsAt,
                      RESERVATION_TIME_ZONE,
                      'HH:mm',
                    )}
                  </span>
                  {exception.label ? ` · ${exception.label}` : ''}
                </p>
                <form action={deleteAvailabilityException}>
                  <input type="hidden" name="id" value={exception.id} />
                  <button
                    type="submit"
                    aria-label="Supprimer l’exception"
                    className="grid size-11 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              Aucune exception à afficher.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

export default AvailabilityPage
