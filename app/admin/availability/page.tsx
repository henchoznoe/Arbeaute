import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AvailabilityExceptionCalendar } from '@/components/admin/availability-exception-calendar'
import { Button } from '@/components/ui/button'
import { formControlClass } from '@/components/ui/form-field'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  createWeeklyAvailability,
  deleteWeeklyAvailability,
} from '@/lib/actions/admin-agenda'
import {
  addLocalMonths,
  getMonthCalendarDateKeys,
  groupAvailabilityExceptions,
  isMonthKey,
  toAvailabilityCalendarSegment,
} from '@/lib/admin/availability-calendar'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { MAX_AVAILABILITY_EXCEPTION_RANGE_DAYS } from '@/lib/reservation/constants'
import {
  addLocalDays,
  getLocalDateKey,
  getLocalDayBounds,
} from '@/lib/reservation/time'

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

const fieldClass = `${formControlClass} min-w-0`

const errorMessages: Record<string, string> = {
  'invalid-range':
    'L’heure de fin doit être après l’heure de début. Corrigez les deux heures et réessayez.',
  'overlap-range':
    'Cet horaire se superpose à un autre du même jour. Modifiez-le ou supprimez d’abord celui qui existe.',
  'invalid-exception':
    'La date ou les heures saisies ne sont pas valables. Vérifiez le jour, l’heure de début et l’heure de fin.',
  'overlap-exception':
    'Cette période se superpose à une ouverture ou une fermeture déjà enregistrée. Supprimez-la d’abord, ou choisissez d’autres heures.',
  'range-too-long':
    'La période dépasse 180 jours. Découpez-la en plusieurs périodes plus courtes.',
}

interface AvailabilityPageProps {
  searchParams: Promise<{ error?: string; month?: string }>
}

const AvailabilityPage = ({
  searchParams,
}: Readonly<AvailabilityPageProps>) => (
  <Suspense fallback={<AdminSkeleton maxWidth="max-w-5xl" />}>
    <Availability searchParams={searchParams} />
  </Suspense>
)

const Availability = async ({
  searchParams,
}: Readonly<AvailabilityPageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { error, month } = await searchParams
  const today = getLocalDateKey(new Date())
  const monthKey = month && isMonthKey(month) ? month : today.slice(0, 7)
  const calendarDateKeys = getMonthCalendarDateKeys(monthKey)
  const firstCalendarDate = calendarDateKeys[0] as string
  const lastCalendarDate = calendarDateKeys.at(-1) as string
  const groupMargin = MAX_AVAILABILITY_EXCEPTION_RANGE_DAYS - 1
  const queryStart = getLocalDayBounds(
    addLocalDays(firstCalendarDate, -groupMargin),
  ).start
  const queryEnd = getLocalDayBounds(
    addLocalDays(lastCalendarDate, groupMargin),
  ).end
  const [weekly, exceptions] = await Promise.all([
    prisma.weeklyAvailability.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    }),
    prisma.availabilityException.findMany({
      where: {
        startsAt: { lt: queryEnd },
        endsAt: { gt: queryStart },
      },
      orderBy: { startsAt: 'asc' },
    }),
  ])
  const segments = exceptions.map(toAvailabilityCalendarSegment)
  const calendarDateKeySet = new Set(calendarDateKeys)
  const visibleGroupIds = new Set(
    segments
      .filter(segment => calendarDateKeySet.has(segment.dateKey))
      .map(segment => segment.groupId),
  )
  const groups = groupAvailabilityExceptions(exceptions).filter(group =>
    visibleGroupIds.has(group.groupId),
  )
  const calendarDays = calendarDateKeys.map(dateKey => ({
    dateKey,
    dayNumber: String(Number(dateKey.slice(-2))),
    inMonth: dateKey.startsWith(monthKey),
    isToday: dateKey === today,
    segments: segments.filter(segment => segment.dateKey === dateKey),
  }))
  const monthLabel = new Intl.DateTimeFormat('fr-CH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${monthKey}-01T12:00:00.000Z`))

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-8">
      <header>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
        >
          <Link href="/admin">
            <ChevronLeft className="size-4" /> Agenda
          </Link>
        </Button>
        <h1 className="mt-2 font-heading text-title font-bold">
          Vos horaires d’ouverture
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Les horaires de la semaine décident des heures que vos clientes voient
          en ligne. Pour un jour particulier — vacances, ouverture spéciale —
          ajoutez une exception au calendrier : une fermeture retire des heures,
          une ouverture en ajoute.
        </p>
      </header>

      {error && errorMessages[error] ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-brand-line bg-brand-subtle p-4 text-sm text-brand-strong"
        >
          {errorMessages[error]}
        </p>
      ) : null}

      <div className="mt-8">
        <AvailabilityExceptionCalendar
          monthKey={monthKey}
          monthLabel={monthLabel}
          previousMonth={addLocalMonths(monthKey, -1)}
          nextMonth={addLocalMonths(monthKey, 1)}
          days={calendarDays}
          segments={segments}
          groups={groups}
          weekly={weekly.map(range => ({
            dayOfWeek: range.dayOfWeek,
            startMinute: range.startMinute,
            endMinute: range.endMinute,
          }))}
        />
      </div>

      <section className="mt-6 rounded-3xl border bg-card p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Horaires hebdomadaires</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ces horaires servent de base à chaque semaine et peuvent être copiés
          dans le calendrier ci-dessus.
        </p>
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
                        <SubmitButton
                          aria-label={`Supprimer l’horaire du ${day.label}`}
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                        >
                          <Trash2 className="size-4" />
                        </SubmitButton>
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
          <SubmitButton pendingLabel="Ajout…" className="mt-auto">
            <Plus className="size-4" /> Ajouter
          </SubmitButton>
        </form>
      </section>
    </main>
  )
}

export default AvailabilityPage
