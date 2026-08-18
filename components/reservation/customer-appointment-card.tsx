'use client'

import { CalendarDays, Download, Repeat2, X, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { WeekAvailabilityPicker } from '@/components/reservation/week-availability-picker'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  cancelCustomerAppointment,
  getCustomerMoveWeekAvailability,
  getNextCustomerMoveAvailableSlot,
  type MutationResult,
  moveCustomerAppointment,
} from '@/lib/actions/reservation'
import type { DayAvailability } from '@/lib/reservation/availability'
import {
  availabilityStateLabels,
  clampDateKey,
  formatCalendarDate,
  formatCalendarPeriod,
} from '@/lib/reservation/calendar-view'
import { describeConfirmationDelivery } from '@/lib/reservation/confirmation-wording'
import { addLocalDays } from '@/lib/reservation/time'
import { capitalizeFirst } from '@/lib/utils/format'
import { openCalendar } from './calendar-download'
import { CancellationPolicy } from './cancellation-policy'

interface CustomerAppointmentCardProps {
  bookingPath: string | null
  calendar: string
  canChange: boolean
  changeDeadlineLabel: string
  customerChangeCutoffLabel: string
  dateLabel: string
  /** Jour du rendez-vous en cours : le calendrier s'y ouvre. */
  dateKey: string
  id: string
  maxDate: string
  minDate: string
  priceLabel: string
  serviceName: string
}

const weekCacheKey = (appointmentId: string, weekStart: string): string =>
  `${appointmentId}|${weekStart}`

export const CustomerAppointmentCard = ({
  bookingPath,
  calendar,
  canChange,
  changeDeadlineLabel,
  customerChangeCutoffLabel,
  dateLabel,
  dateKey,
  id,
  maxDate,
  minDate,
  priceLabel,
  serviceName,
}: Readonly<CustomerAppointmentCardProps>) => {
  const router = useRouter()
  const [moving, setMoving] = useState(false)
  const [date, setDate] = useState(minDate)
  const [viewStart, setViewStart] = useState(minDate)
  const [availability, setAvailability] = useState<
    Record<string, DayAvailability>
  >({})
  const [loadedWeek, setLoadedWeek] = useState<string | null>(null)
  const [startsAt, setStartsAt] = useState('')
  const [calendarAnnouncement, setCalendarAnnouncement] = useState('')
  const [nextSlotNotice, setNextSlotNotice] = useState<string | null>(null)
  const [calendarNotice, setCalendarNotice] = useState<string | null>(null)
  const [result, setResult] = useState<MutationResult | null>(null)
  const [loadingWeek, startWeekTransition] = useTransition()
  const [searchingNext, startNextTransition] = useTransition()
  const [mutating, startMutationTransition] = useTransition()
  const pendingSlotRef = useRef<{ startsAt: string } | null>(null)
  const weekEnd = addLocalDays(viewStart, 6)
  const lastCompleteWeekStart = addLocalDays(maxDate, -6)
  const maxViewStart =
    lastCompleteWeekStart < minDate ? minDate : lastCompleteWeekStart
  const weekReady = loadedWeek === weekCacheKey(id, viewStart)

  useEffect(() => {
    if (!moving) return
    startWeekTransition(async () => {
      const loaded = await getCustomerMoveWeekAvailability(id, viewStart)
      const pending = pendingSlotRef.current
      pendingSlotRef.current = null
      setAvailability(loaded)
      setLoadedWeek(weekCacheKey(id, viewStart))
      setStartsAt(current => {
        const candidate = pending?.startsAt ?? current
        const stillAvailable = Object.values(loaded).some(day =>
          day.slots.some(slot => slot.startsAt === candidate),
        )
        return stillAvailable ? candidate : ''
      })
    })
  }, [id, moving, viewStart])

  const deliveryNotice = result?.ok
    ? describeConfirmationDelivery(result.notifiedEmail)
    : null

  const openMoveCalendar = () => {
    // Le calendrier s'ouvrait sur la première date réservable : quelqu'un dont
    // le rendez-vous est dans trois semaines devait parcourir trois semaines à
    // la main pour retrouver le sien. Il s'ouvre désormais sur sa semaine, et
    // décaler d'un jour ne demande plus aucun changement de semaine.
    const anchor = clampDateKey(dateKey, minDate, maxViewStart)
    setDate(anchor)
    setViewStart(anchor)
    setStartsAt('')
    setResult(null)
    setNextSlotNotice(null)
    setMoving(true)
  }

  const changeWeek = (amount: number) => {
    const next = clampDateKey(
      addLocalDays(viewStart, amount),
      minDate,
      maxViewStart,
    )
    setViewStart(next)
    setDate(next)
    setStartsAt('')
    setNextSlotNotice(null)
    setCalendarAnnouncement(
      `Période du ${formatCalendarPeriod(next, addLocalDays(next, 6))} affichée.`,
    )
  }

  const selectDate = (dateKey: string) => {
    setDate(dateKey)
    setStartsAt('')
    setNextSlotNotice(null)
    const state = availability[dateKey]?.state
    setCalendarAnnouncement(
      `${formatCalendarDate(dateKey)} sélectionné${
        state ? ` : ${availabilityStateLabels[state].toLowerCase()}` : ''
      }.`,
    )
  }

  const findNextSlot = () => {
    setNextSlotNotice(null)
    startNextTransition(async () => {
      const found = await getNextCustomerMoveAvailableSlot(id, date)
      if (!found) {
        setNextSlotNotice(
          'Aucun autre créneau disponible dans les prochains mois.',
        )
        return
      }

      setDate(found.dateKey)
      setNextSlotNotice(
        `Prochain créneau trouvé : ${formatCalendarDate(found.dateKey)} à ${found.slot.label}.`,
      )
      if (found.dateKey >= viewStart && found.dateKey <= weekEnd) {
        setStartsAt(found.slot.startsAt)
        return
      }
      pendingSlotRef.current = { startsAt: found.slot.startsAt }
      setViewStart(found.dateKey > maxViewStart ? maxViewStart : found.dateKey)
    })
  }

  const move = () => {
    setResult(null)
    startMutationTransition(async () => {
      const response = await moveCustomerAppointment({
        appointmentId: id,
        startsAt,
      })
      setResult(response)
      if (response.ok) {
        setMoving(false)
        router.refresh()
      }
    })
  }

  const cancel = () => {
    setResult(null)
    startMutationTransition(async () => {
      const response = await cancelCustomerAppointment({ appointmentId: id })
      setResult(response)
      if (response.ok) router.refresh()
    })
  }

  const addToCalendar = async () => {
    const opened = await openCalendar(calendar, 'rendez-vous-arbeaute.ics')
    if (opened === 'DOWNLOADED')
      setCalendarNotice(
        'Le fichier a été téléchargé. Ouvrez-le depuis vos téléchargements avec votre application calendrier.',
      )
    else if (opened === 'SHARED')
      setCalendarNotice('Le calendrier a été transmis à l’application choisie.')
  }

  return (
    <article className="rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
      <p className="text-sm font-medium text-brand-strong">
        Rendez-vous confirmé
      </p>
      <h3 className="mt-1 font-heading text-2xl font-bold">{serviceName}</h3>
      <p className="mt-3">{capitalizeFirst(dateLabel)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{priceLabel}</p>

      {!moving ? (
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button type="button" variant="outline" onClick={addToCalendar}>
            <Download className="size-4" /> Calendrier
          </Button>
          {bookingPath ? (
            <Button asChild variant="secondary">
              <Link href={bookingPath}>
                <Repeat2 className="size-4" /> Réserver à nouveau
              </Link>
            </Button>
          ) : null}
          {canChange ? (
            <>
              <Button type="button" onClick={openMoveCalendar}>
                <CalendarDays className="size-4" /> Déplacer
              </Button>
              <ConfirmDialog
                title="Annuler ce rendez-vous ?"
                description="Le créneau sera libéré et rendu disponible pour quelqu’un d’autre. Pour revenir, il faudra en réserver un nouveau."
                confirmLabel="Annuler le rendez-vous"
                cancelLabel="Garder mon rendez-vous"
                onConfirm={cancel}
                pending={mutating}
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={mutating}
                  >
                    <X className="size-4" /> Annuler
                  </Button>
                }
              />
            </>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-muted p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-heading text-xl font-bold">
                Choisissez le nouveau créneau
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                La prestation reste inchangée.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={findNextSlot}
              disabled={searchingNext}
            >
              <Zap className="size-4" />
              {searchingNext ? 'Recherche…' : 'Prochain créneau'}
            </Button>
          </div>
          {nextSlotNotice ? (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              {nextSlotNotice}
            </p>
          ) : null}
          <WeekAvailabilityPicker
            announcement={calendarAnnouncement}
            availability={availability}
            date={date}
            loading={loadingWeek}
            maxDate={maxDate}
            minDate={minDate}
            onChangeWeek={changeWeek}
            onSelectDate={selectDate}
            onSelectSlot={setStartsAt}
            ready={weekReady}
            startsAt={startsAt}
            viewStart={viewStart}
          />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMoving(false)}
            >
              Retour
            </Button>
            <Button
              type="button"
              disabled={!startsAt || mutating}
              onClick={move}
            >
              Confirmer le déplacement
            </Button>
          </div>
        </div>
      )}

      {calendarNotice ? (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          {calendarNotice}
        </p>
      ) : null}

      <CancellationPolicy
        className="mt-5"
        cutoffLabel={customerChangeCutoffLabel}
        expired={!canChange}
        deadlineLabel={canChange ? changeDeadlineLabel : undefined}
      />

      {result ? (
        <div
          className={
            result.ok
              ? 'mt-4 rounded-xl bg-success-subtle p-3 text-sm text-success-strong'
              : 'mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive'
          }
          role={result.ok ? 'status' : 'alert'}
        >
          <p>{result.message}</p>
          {/* Le même traitement que l'écran de confirmation : on annonce
              l'adresse à laquelle le message part, et rien quand rien ne part. */}
          {deliveryNotice ? (
            <p className="mt-1">{deliveryNotice.title}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
