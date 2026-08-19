import { Clock3, Plus, Trash2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AvailabilityExceptionCalendar } from '@/components/admin/availability-exception-calendar'
import { FormField, formControlClass } from '@/components/ui/form-field'
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
import { formatCalendarMonth } from '@/lib/reservation/calendar-view'
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
  <Suspense fallback={<AdminSkeleton variant="form" />}>
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
  const monthLabel = formatCalendarMonth(monthKey)

  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/settings"
        backLabel="Réglages"
        eyebrow="Arbeauté"
        title="Vos horaires d’ouverture"
        icon={Clock3}
        description="Les horaires de la semaine décident des heures que le site propose en ligne. Pour un jour particulier — vacances, ouverture spéciale — marquez-le dans le calendrier : une fermeture retire des heures, une ouverture en ajoute."
      />

      {error && errorMessages[error] ? (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-brand-line bg-brand-subtle p-4 text-sm text-brand-strong"
        >
          {errorMessages[error]}
        </p>
      ) : null}

      <div className="mt-6">
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

      <section className="mt-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold">Horaires hebdomadaires</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ces horaires servent de base à chaque semaine et peuvent être copiés
          dans le calendrier ci-dessus.
        </p>
        <div className="mt-5 grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {days.map(day => {
            const ranges = weekly.filter(range => range.dayOfWeek === day.value)
            return (
              <div
                key={day.value}
                className="min-w-0 rounded-2xl border bg-background p-4"
              >
                <p className="font-medium">{day.label}</p>
                <div className="mt-2 flex flex-wrap gap-2">
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
          className="mt-5 grid gap-3 sm:max-w-2xl sm:grid-cols-[1.3fr_1fr_1fr_auto]"
        >
          <FormField controlId="weekly-day" label="Jour">
            <select id="weekly-day" name="dayOfWeek" className={fieldClass}>
              {days.map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField controlId="weekly-start" label="Début">
            <input
              id="weekly-start"
              name="startTime"
              type="time"
              step={900}
              defaultValue="08:00"
              required
              className={fieldClass}
            />
          </FormField>
          <FormField controlId="weekly-end" label="Fin">
            <input
              id="weekly-end"
              name="endTime"
              type="time"
              step={900}
              defaultValue="11:30"
              required
              className={fieldClass}
            />
          </FormField>
          <SubmitButton pendingLabel="Ajout…" className="mt-auto">
            <Plus className="size-4" /> Ajouter
          </SubmitButton>
        </form>
      </section>
    </AdminPage>
  )
}

export default AvailabilityPage
