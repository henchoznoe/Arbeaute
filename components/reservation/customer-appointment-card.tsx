'use client'

import { CalendarDays, Download, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import {
  cancelCustomerAppointment,
  getCustomerMoveAvailability,
  type MutationResult,
  moveCustomerAppointment,
} from '@/lib/actions/reservation'
import type { AvailableSlot } from '@/lib/reservation/availability'
import { cn } from '@/lib/utils/cn'
import { downloadCalendar } from './calendar-download'
import { CancellationPolicy } from './cancellation-policy'

interface CustomerAppointmentCardProps {
  id: string
  serviceName: string
  dateLabel: string
  dateKey: string
  priceLabel: string
  canChange: boolean
  changeDeadlineLabel: string
  calendar: string
  maxDate: string
  minDate: string
}

export const CustomerAppointmentCard = ({
  id,
  serviceName,
  dateLabel,
  dateKey,
  priceLabel,
  canChange,
  changeDeadlineLabel,
  calendar,
  maxDate,
  minDate,
}: Readonly<CustomerAppointmentCardProps>) => {
  const router = useRouter()
  const [moving, setMoving] = useState(false)
  const [date, setDate] = useState(dateKey)
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [startsAt, setStartsAt] = useState('')
  const [result, setResult] = useState<MutationResult | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!moving) return
    startTransition(async () => {
      setStartsAt('')
      setSlots(await getCustomerMoveAvailability(id, date))
    })
  }, [date, id, moving])

  const move = () => {
    startTransition(async () => {
      const response = await moveCustomerAppointment({
        appointmentId: id,
        startsAt,
      })
      setResult(response)
      if (response.ok) {
        setMoving(false)
        if (response.calendar)
          downloadCalendar(response.calendar, 'rendez-vous-arbeaute.ics')
        router.refresh()
      }
    })
  }

  const cancel = () => {
    startTransition(async () => {
      const response = await cancelCustomerAppointment({ appointmentId: id })
      setResult(response)
      // L'annulation supprime la session client côté serveur : on redirige avec
      // un marqueur plutôt que de compter sur un état local, qui serait perdu au
      // rafraîchissement automatique déclenché par l'action serveur.
      if (response.ok) router.push('/mes-rendez-vous?cancelled=1')
    })
  }

  return (
    <article className="rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
      <p className="text-sm font-medium text-rose-600">Rendez-vous confirmé</p>
      <h2 className="mt-1 font-heading text-2xl font-bold">{serviceName}</h2>
      <p className="mt-3 capitalize">{dateLabel}</p>
      <p className="mt-1 text-sm text-muted-foreground">{priceLabel}</p>

      {!moving ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              downloadCalendar(calendar, 'rendez-vous-arbeaute.ics')
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium"
          >
            <Download className="size-4" /> Calendrier
          </button>
          {canChange ? (
            <>
              <button
                type="button"
                onClick={() => setMoving(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                <CalendarDays className="size-4" /> Déplacer
              </button>
              {confirmingCancel ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirmingCancel(false)}
                    className="h-11 rounded-xl border px-4 text-sm font-medium"
                  >
                    Garder
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={cancel}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive px-4 text-sm font-medium text-destructive-foreground"
                  >
                    <X className="size-4" /> Confirmer l’annulation
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmingCancel(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 text-sm font-medium text-destructive"
                >
                  <X className="size-4" /> Annuler
                </button>
              )}
            </>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-muted p-4">
          <label className="text-sm font-medium">
            Nouvelle date
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={event => setDate(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-background px-3"
            />
          </label>
          {pending ? (
            <p className="mt-4 text-sm text-muted-foreground">Recherche…</p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map(slot => (
                <button
                  key={slot.startsAt}
                  type="button"
                  onClick={() => setStartsAt(slot.startsAt)}
                  className={cn(
                    'h-10 rounded-lg border bg-background text-sm',
                    startsAt === slot.startsAt &&
                      'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
          {!pending && slots.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucun créneau ce jour-là.
            </p>
          ) : null}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setMoving(false)}
              className="h-11 flex-1 rounded-xl border bg-background px-4 text-sm font-medium"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={!startsAt || pending}
              onClick={move}
              className="h-11 flex-1 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              Confirmer
            </button>
          </div>
        </div>
      )}

      <CancellationPolicy
        className="mt-5"
        expired={!canChange}
        deadlineLabel={canChange ? changeDeadlineLabel : undefined}
      />

      {result && !result.ok ? (
        <p
          className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {result.message}
        </p>
      ) : null}
    </article>
  )
}
