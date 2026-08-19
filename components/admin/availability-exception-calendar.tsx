'use client'

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  LoaderCircle,
  Minus,
  Palmtree,
  Plus,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField, formControlClass } from '@/components/ui/form-field'
import { SidePanel } from '@/components/ui/side-panel'
import {
  createAvailabilityException,
  deleteAvailabilityExceptionGroup,
} from '@/lib/actions/admin-agenda'
import {
  type AvailabilityCalendarSegment,
  type AvailabilityExceptionGroup,
  describeExceptionDay,
  getExceptionCountNoun,
  hasAvailabilityExceptionOverlap,
} from '@/lib/admin/availability-calendar'
import { formatCalendarDayDate } from '@/lib/reservation/calendar-view'
import { formatLongDate } from '@/lib/reservation/time'
import { capitalizeFirst } from '@/lib/utils/format'

interface CalendarDay {
  dateKey: string
  dayNumber: string
  inMonth: boolean
  isToday: boolean
  segments: AvailabilityCalendarSegment[]
}

interface WeeklyRange {
  dayOfWeek: number
  startMinute: number
  endMinute: number
}

interface AvailabilityExceptionCalendarProps {
  monthKey: string
  monthLabel: string
  previousMonth: string
  nextMonth: string
  days: CalendarDay[]
  segments: AvailabilityCalendarSegment[]
  groups: AvailabilityExceptionGroup[]
  weekly: WeeklyRange[]
}

type Shortcut = 'CUSTOM' | 'ALL_DAY' | 'COPY_WEEKLY' | 'VACATION'

const DAY_LABELS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']
const CALENDAR_DAY_LABELS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

const dateFromKey = (dateKey: string): Date =>
  new Date(`${dateKey}T12:00:00.000Z`)

const addDays = (dateKey: string, amount: number): string => {
  const date = dateFromKey(dateKey)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

const dateKeysInRange = (from: string, to: string): string[] => {
  if (!from || !to || to < from) return []
  const keys: string[] = []
  for (let cursor = from; cursor <= to && keys.length <= 180; ) {
    keys.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return keys
}

const minuteFromTime = (time: string): number => {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

const minuteLabel = (minute: number): string =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(
    minute % 60,
  ).padStart(2, '0')}`

const formatDate = (dateKey: string): string =>
  formatLongDate(dateFromKey(dateKey))

const formatShortDate = (dateKey: string): string =>
  formatCalendarDayDate(dateKey)

const shortcutButtons: Array<{
  value: Shortcut
  label: string
  icon: typeof Clock3
}> = [
  { value: 'CUSTOM', label: 'Plage horaire', icon: Clock3 },
  { value: 'ALL_DAY', label: 'Journée entière', icon: CalendarDays },
  { value: 'COPY_WEEKLY', label: 'Copier les horaires', icon: Copy },
  { value: 'VACATION', label: 'Vacances', icon: Palmtree },
]

export const AvailabilityExceptionCalendar = ({
  monthKey,
  monthLabel,
  previousMonth,
  nextMonth,
  days,
  segments,
  groups,
  weekly,
}: Readonly<AvailabilityExceptionCalendarProps>) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [selectedDate, setSelectedDate] = useState(
    days.find(day => day.isToday)?.dateKey ?? `${monthKey}-01`,
  )
  const [endDate, setEndDate] = useState('')
  const [shortcut, setShortcut] = useState<Shortcut>('CUSTOM')
  const [type, setType] = useState<'AVAILABLE' | 'UNAVAILABLE'>('UNAVAILABLE')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('12:00')
  const [label, setLabel] = useState('')
  const [copyDayOfWeek, setCopyDayOfWeek] = useState(1)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const selectDate = (dateKey: string) => {
    setSelectedDate(dateKey)
    // Un jour particulier a toujours une fin, même quand elle tombe le jour
    // même : une case vide laissait croire à une période sans terme.
    setEndDate(dateKey)
    setShortcut('CUSTOM')
    setType('UNAVAILABLE')
    setLabel('')
    const selectedDay = dateFromKey(dateKey).getUTCDay()
    setCopyDayOfWeek(
      weekly.some(range => range.dayOfWeek === selectedDay)
        ? selectedDay
        : (weekly[0]?.dayOfWeek ?? 1),
    )
    setOpen(true)
  }

  const chooseShortcut = (value: Shortcut) => {
    const leavesVacation = shortcut === 'VACATION' && value !== 'VACATION'
    setShortcut(value)
    if (value === 'VACATION') {
      setType('UNAVAILABLE')
      setEndDate(addDays(selectedDate, 6))
      setLabel('Vacances')
    } else if (value === 'COPY_WEEKLY') {
      setType('AVAILABLE')
      setEndDate(selectedDate)
      if (label === 'Vacances') setLabel('')
    } else {
      if (leavesVacation) setEndDate(selectedDate)
      if (label === 'Vacances') setLabel('')
    }
  }

  const proposedSegments = useMemo(() => {
    if (shortcut === 'COPY_WEEKLY')
      return weekly
        .filter(range => range.dayOfWeek === copyDayOfWeek)
        .map(range => ({
          dateKey: selectedDate,
          startMinute: range.startMinute,
          endMinute: range.endMinute,
        }))
    const dateKeys = dateKeysInRange(selectedDate, endDate || selectedDate)
    if (shortcut === 'ALL_DAY' || shortcut === 'VACATION')
      return dateKeys.map(dateKey => ({
        dateKey,
        startMinute: 0,
        endMinute: 24 * 60,
      }))
    const startMinute = minuteFromTime(startTime)
    const endMinute = minuteFromTime(endTime)
    if (startMinute >= endMinute) return []
    return dateKeys.map(dateKey => ({ dateKey, startMinute, endMinute }))
  }, [
    copyDayOfWeek,
    endDate,
    endTime,
    selectedDate,
    shortcut,
    startTime,
    weekly,
  ])
  const hasConflict = hasAvailabilityExceptionOverlap(
    proposedSegments,
    segments,
  )
  const invalidRange = Boolean(endDate && endDate < selectedDate)
  const missingEndDate = shortcut !== 'COPY_WEEKLY' && !endDate
  const tooLongRange =
    new Set(proposedSegments.map(segment => segment.dateKey)).size > 180
  const missingCopiedHours =
    shortcut === 'COPY_WEEKLY' && proposedSegments.length === 0

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      hasConflict ||
      invalidRange ||
      missingEndDate ||
      tooLongRange ||
      missingCopiedHours ||
      !proposedSegments.length
    )
      return
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      await createAvailabilityException(formData)
      setOpen(false)
      router.refresh()
    })
  }

  const removeGroup = (groupId: string) => {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteAvailabilityExceptionGroup(groupId)
      if (result.ok) router.refresh()
      else setDeleteError(result.message)
    })
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <section className="rounded-3xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline" size="icon">
            <Link
              href={`/admin/availability?month=${previousMonth}`}
              aria-label="Mois précédent"
            >
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Jours particuliers
            </p>
            <h2 className="font-heading text-2xl font-bold">
              {capitalizeFirst(monthLabel)}
            </h2>
          </div>
          <Button asChild variant="outline" size="icon">
            <Link
              href={`/admin/availability?month=${nextMonth}`}
              aria-label="Mois suivant"
            >
              <ChevronRight className="size-5" />
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1" aria-hidden="true">
          {CALENDAR_DAY_LABELS.map(day => (
            <span
              key={day}
              className="py-1 text-center text-[11px] font-semibold text-muted-foreground"
            >
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const openings = day.segments.filter(
              segment => segment.type === 'AVAILABLE',
            ).length
            const closures = day.segments.filter(
              segment => segment.type === 'UNAVAILABLE',
            ).length
            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => selectDate(day.dateKey)}
                aria-label={describeExceptionDay(
                  formatDate(day.dateKey),
                  openings,
                  closures,
                )}
                className={`relative flex min-h-16 min-w-0 flex-col items-center rounded-xl border p-1.5 text-sm transition hover:border-primary/40 hover:bg-muted sm:min-h-20 sm:items-start sm:p-2 ${
                  day.inMonth
                    ? 'bg-background'
                    : 'bg-muted/30 text-muted-foreground'
                } ${day.isToday ? 'ring-2 ring-primary/40' : ''}`}
              >
                <span
                  className={`grid size-7 place-items-center rounded-full font-semibold ${day.isToday ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  {day.dayNumber}
                </span>
                {/* Le sens se lit sur l'icône, jamais sur la seule couleur :
                    plus pour ce qu'un jour particulier ajoute, moins pour ce
                    qu'il retire. Le nom revient à `lg`, où la cellule est
                    assez large pour le porter sans le couper. */}
                <span
                  className="mt-auto flex w-full flex-col gap-1"
                  aria-hidden="true"
                >
                  {openings ? (
                    <span className="flex items-center justify-center gap-0.5 rounded bg-success-soft px-1 py-0.5 text-2xs font-semibold text-success-strong sm:justify-start">
                      <Plus className="size-3 shrink-0" />
                      {openings}
                      <span className="hidden lg:inline">
                        {getExceptionCountNoun(openings, 'AVAILABLE')}
                      </span>
                    </span>
                  ) : null}
                  {closures ? (
                    <span className="flex items-center justify-center gap-0.5 rounded bg-warning-soft px-1 py-0.5 text-2xs font-semibold text-warning-strong sm:justify-start">
                      <Minus className="size-3 shrink-0" />
                      {closures}
                      <span className="hidden lg:inline">
                        {getExceptionCountNoun(closures, 'UNAVAILABLE')}
                      </span>
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
        <Button
          type="button"
          onClick={() =>
            selectDate(
              days.find(day => day.isToday)?.dateKey ?? `${monthKey}-01`,
            )
          }
          className="mt-4 w-full sm:w-auto"
        >
          <Plus className="size-4" /> Ajouter un jour particulier
        </Button>
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold">Périodes enregistrées</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Une suppression retire tout le groupe créé en une seule saisie.
        </p>
        {deleteError ? (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {deleteError}
          </p>
        ) : null}
        {groups.length ? (
          <ul className="mt-4 space-y-3">
            {groups.map(group => (
              <li
                key={group.groupId}
                className="rounded-2xl border bg-background p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      group.type === 'AVAILABLE'
                        ? 'bg-success-soft text-success-strong'
                        : 'bg-warning-soft text-warning-strong'
                    }`}
                  >
                    {group.type === 'AVAILABLE' ? 'Ouverture' : 'Fermeture'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {group.label ||
                        (group.type === 'AVAILABLE'
                          ? 'Ouverture en plus'
                          : 'Institut fermé')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatShortDate(group.from)}
                      {group.to !== group.from
                        ? ` – ${formatShortDate(group.to)}`
                        : ''}{' '}
                      · {group.dayCount} jour{group.dayCount > 1 ? 's' : ''}
                    </p>
                    <p className="mt-1 text-xs font-medium">
                      {group.timeLabels.join(' · ')}
                    </p>
                  </div>
                </div>
                <ConfirmDialog
                  title={`Supprimer ${group.dayCount} jour${group.dayCount > 1 ? 's' : ''} particulier${group.dayCount > 1 ? 's' : ''} ?`}
                  description={`Toute la période du ${formatShortDate(group.from)}${group.to !== group.from ? ` au ${formatShortDate(group.to)}` : ''} sera supprimée d’un coup, et vos horaires habituels reprendront sur ces jours.`}
                  confirmLabel="Oui, supprimer cette période"
                  cancelLabel="Non, la garder"
                  onConfirm={() => removeGroup(group.groupId)}
                  pending={pending}
                  trigger={
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={pending}
                      className="mt-3 w-full sm:w-auto"
                    >
                      <Trash2 className="size-4" /> Supprimer la période
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Aucun jour particulier ce mois-ci : vos horaires habituels
            s’appliquent partout.
          </p>
        )}
      </section>

      <SidePanel
        open={open}
        onOpenChange={setOpen}
        eyebrow="Jour particulier"
        title={capitalizeFirst(formatDate(selectedDate))}
        description="Fermez l’institut sur ce jour, ou ouvrez des heures en plus de vos horaires habituels."
      >
        <form method="post" onSubmit={submit} className="space-y-5">
          <input type="hidden" name="shortcut" value={shortcut} />
          <div className="grid grid-cols-2 gap-2">
            {shortcutButtons.map(option => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => chooseShortcut(option.value)}
                  aria-pressed={shortcut === option.value}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold transition ${
                    shortcut === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Icon className="size-4" /> {option.label}
                </button>
              )
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField controlId="exception-date" label="Date">
              <input
                id="exception-date"
                name="date"
                type="date"
                required
                min={days[0]?.dateKey}
                max={days.at(-1)?.dateKey}
                value={selectedDate}
                onChange={event => {
                  const dateKey = event.target.value
                  setSelectedDate(dateKey)
                  if (shortcut === 'VACATION') setEndDate(addDays(dateKey, 6))
                  else if (!endDate || endDate < dateKey) setEndDate(dateKey)
                }}
                className={formControlClass}
              />
            </FormField>
            {shortcut !== 'COPY_WEEKLY' ? (
              <FormField controlId="exception-end-date" label="Jusqu’au">
                <input
                  id="exception-end-date"
                  name="endDate"
                  type="date"
                  required
                  min={selectedDate}
                  max={addDays(selectedDate, 179)}
                  value={endDate}
                  onChange={event => setEndDate(event.target.value)}
                  className={formControlClass}
                />
              </FormField>
            ) : (
              <input type="hidden" name="endDate" value={selectedDate} />
            )}
          </div>

          {shortcut === 'COPY_WEEKLY' ? (
            <FormField controlId="exception-copy-day" label="Horaire modèle">
              <select
                id="exception-copy-day"
                name="copyDayOfWeek"
                value={copyDayOfWeek}
                onChange={event => setCopyDayOfWeek(Number(event.target.value))}
                className={formControlClass}
              >
                {[1, 2, 3, 4, 5, 6, 0].map(dayOfWeek => {
                  const ranges = weekly.filter(
                    range => range.dayOfWeek === dayOfWeek,
                  )
                  return (
                    <option
                      key={dayOfWeek}
                      value={dayOfWeek}
                      disabled={!ranges.length}
                    >
                      {DAY_LABELS[dayOfWeek]} —{' '}
                      {ranges.length
                        ? ranges
                            .map(
                              range =>
                                `${minuteLabel(range.startMinute)}–${minuteLabel(range.endMinute)}`,
                            )
                            .join(', ')
                        : 'fermé'}
                    </option>
                  )
                })}
              </select>
            </FormField>
          ) : null}

          {shortcut === 'COPY_WEEKLY' || shortcut === 'VACATION' ? (
            <div className="flex flex-col gap-2 text-sm font-medium">
              <span>Type</span>
              <input
                type="hidden"
                name="type"
                value={shortcut === 'COPY_WEEKLY' ? 'AVAILABLE' : 'UNAVAILABLE'}
              />
              {/* Le raccourci a déjà tranché : la nature se lit, elle ne se
                  choisit plus. */}
              <p className="flex min-h-11 items-center rounded-xl border bg-muted px-3 font-normal">
                {shortcut === 'COPY_WEEKLY' ? 'Ouverture' : 'Fermeture'}
              </p>
            </div>
          ) : (
            <FormField controlId="exception-type" label="Type">
              <select
                id="exception-type"
                name="type"
                value={type}
                onChange={event => setType(event.target.value as typeof type)}
                className={formControlClass}
              >
                <option value="UNAVAILABLE">Fermeture</option>
                <option value="AVAILABLE">Ouverture</option>
              </select>
            </FormField>
          )}

          {shortcut === 'CUSTOM' ? (
            <div className="grid grid-cols-2 gap-4">
              <FormField controlId="exception-start-time" label="Début">
                <input
                  id="exception-start-time"
                  name="startTime"
                  type="time"
                  step={900}
                  required
                  value={startTime}
                  onChange={event => setStartTime(event.target.value)}
                  className={formControlClass}
                />
              </FormField>
              <FormField controlId="exception-end-time" label="Fin">
                <input
                  id="exception-end-time"
                  name="endTime"
                  type="time"
                  step={900}
                  required
                  value={endTime}
                  onChange={event => setEndTime(event.target.value)}
                  className={formControlClass}
                />
              </FormField>
            </div>
          ) : (
            <>
              <input type="hidden" name="startTime" value="" />
              <input type="hidden" name="endTime" value="" />
            </>
          )}

          <FormField controlId="exception-label" label="Motif" optional>
            <input
              id="exception-label"
              name="label"
              maxLength={120}
              value={label}
              onChange={event => setLabel(event.target.value)}
              placeholder="Vacances, formation, ouverture…"
              className={formControlClass}
            />
          </FormField>

          {tooLongRange ? (
            <p role="alert" className="text-sm text-destructive">
              Cette période dépasse la limite de 180 jours.
            </p>
          ) : hasConflict ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              Cette plage se superpose à une ouverture ou à une fermeture déjà
              enregistrée. Modifiez-la avant l’envoi.
            </p>
          ) : invalidRange ? (
            <p role="alert" className="text-sm text-destructive">
              La date de fin doit suivre la date de début.
            </p>
          ) : missingEndDate ? (
            <p role="alert" className="text-sm text-destructive">
              Indiquez jusqu’à quand la période s’étend — le jour même si elle
              ne dure qu’une journée.
            </p>
          ) : missingCopiedHours ? (
            <p role="alert" className="text-sm text-destructive">
              Ce jour modèle ne contient aucun horaire à copier.
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={
              pending ||
              hasConflict ||
              invalidRange ||
              missingEndDate ||
              tooLongRange ||
              missingCopiedHours ||
              !proposedSegments.length
            }
            className="w-full"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Enregistrer ce jour particulier
          </Button>
        </form>
      </SidePanel>
    </div>
  )
}
