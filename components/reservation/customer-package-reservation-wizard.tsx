'use client'

import { Check, ChevronLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ConfirmationActions } from '@/components/reservation/confirmation-actions'
import { WeekAvailabilityPicker } from '@/components/reservation/week-availability-picker'
import { Button } from '@/components/ui/button'
import { FormField, formControlClass } from '@/components/ui/form-field'
import {
  createPublicCustomerPackageSession,
  identifyCustomerForPackageBooking,
  type PackageBookingResult,
} from '@/lib/actions/packages'
import { getPublicWeekAvailability } from '@/lib/actions/reservation'
import type { BookableCustomerPackage } from '@/lib/packages/customer-packages'
import { formatInstallmentChoice } from '@/lib/packages/domain'
import type { DayAvailability } from '@/lib/reservation/availability'
import { formatCalendarPeriod } from '@/lib/reservation/calendar-view'
import {
  addLocalDays,
  formatLongDate,
  getLocalDateKey,
} from '@/lib/reservation/time'
import { formatPrice } from '@/lib/utils/format'

export const CustomerPackageReservationWizard = ({
  packages,
  requestedId,
  requestedServiceId,
  requestedStartsAt,
  authenticated,
  identificationError,
  minDate,
  maxDate,
}: Readonly<{
  packages: BookableCustomerPackage[]
  requestedId: string | null
  requestedServiceId: string | null
  requestedStartsAt: string | null
  authenticated: boolean
  identificationError: boolean
  minDate: string
  maxDate: string
}>) => {
  const initial = packages.find(item => item.id === requestedId) ?? null
  const initialService = initial?.services.find(
    service => service.id === requestedServiceId,
  )
  const requestedDate = (() => {
    if (!requestedStartsAt) return null
    const value = new Date(requestedStartsAt)
    return Number.isNaN(value.getTime()) ? null : getLocalDateKey(value)
  })()
  const initialDate =
    requestedDate && requestedDate >= minDate && requestedDate <= maxDate
      ? requestedDate
      : minDate
  const [packageId, setPackageId] = useState(initial?.id ?? '')
  const selectedPackage = packages.find(item => item.id === packageId)
  const [serviceId, setServiceId] = useState(
    initialService?.id ??
      (initial?.services.length === 1 ? (initial.services[0]?.id ?? '') : ''),
  )
  const [viewStart, setViewStart] = useState(initialDate)
  const [date, setDate] = useState(initialDate)
  const [startsAt, setStartsAt] = useState(
    requestedDate === initialDate ? (requestedStartsAt ?? '') : '',
  )
  const [availability, setAvailability] = useState<
    Record<string, DayAvailability>
  >({})
  const [loading, startLoading] = useTransition()
  const [submitting, startSubmitting] = useTransition()
  const [result, setResult] = useState<PackageBookingResult | null>(null)
  const availabilityRequest = useRef(0)
  const selectedService = selectedPackage?.services.find(
    service => service.id === serviceId,
  )
  const packageMaxDate = selectedPackage?.expiresAt
    ? getLocalDateKey(new Date(selectedPackage.expiresAt))
    : maxDate
  const effectiveMaxDate = packageMaxDate < maxDate ? packageMaxDate : maxDate
  const maxViewStart =
    addLocalDays(effectiveMaxDate, -6) < minDate
      ? minDate
      : addLocalDays(effectiveMaxDate, -6)
  const ready = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addLocalDays(viewStart, index),
      ).every(key => Boolean(availability[key])),
    [availability, viewStart],
  )

  useEffect(() => {
    const request = availabilityRequest.current + 1
    availabilityRequest.current = request
    if (!serviceId) return
    startLoading(async () => {
      const loaded = await getPublicWeekAvailability(serviceId, viewStart)
      if (availabilityRequest.current !== request) return
      const bookableOnly = Object.fromEntries(
        Object.entries(loaded).map(([key, day]) => [
          key,
          {
            ...day,
            slots: day.slots.filter(
              slot => slot.state === 'OPEN' && key <= effectiveMaxDate,
            ),
            state: day.slots.some(
              slot => slot.state === 'OPEN' && key <= effectiveMaxDate,
            )
              ? 'AVAILABLE'
              : day.state === 'CLOSED'
                ? 'CLOSED'
                : 'FULL',
          },
        ]),
      ) as Record<string, DayAvailability>
      setAvailability(current => ({ ...current, ...bookableOnly }))
      setStartsAt(current =>
        current &&
        Object.values(bookableOnly).some(day =>
          day.slots.some(slot => slot.startsAt === current),
        )
          ? current
          : '',
      )
      const first = Array.from({ length: 7 }, (_, index) =>
        addLocalDays(viewStart, index),
      ).find(key => bookableOnly[key]?.slots.length)
      if (first) setDate(first)
    })
  }, [effectiveMaxDate, serviceId, viewStart])

  if (!authenticated)
    return (
      <section className="mx-auto max-w-md rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="font-heading text-2xl font-bold">
          Retrouver mon forfait
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Saisissez l’adresse e-mail utilisée lors de l’achat. Elle suffit pour
          retrouver vos séances, sans créer de doublon.
        </p>
        <form
          action={identifyCustomerForPackageBooking}
          className="mt-6 space-y-4"
        >
          {requestedId ? (
            <input type="hidden" name="customerPackageId" value={requestedId} />
          ) : null}
          <FormField controlId="package-customer-email" label="Adresse e-mail">
            <input
              id="package-customer-email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              className={formControlClass}
            />
          </FormField>
          <label className="sr-only" aria-hidden="true">
            Site web
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          {identificationError ? (
            <p
              className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              Aucun forfait actif ne peut être ouvert avec cette adresse.
              Vérifiez l’adresse ou contactez Arzu.
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            <Mail className="size-4" />
            Voir mes forfaits
          </Button>
        </form>
      </section>
    )

  if (result?.appointment)
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border bg-card p-6 sm:p-9">
        <p className="flex items-center gap-2 font-semibold text-success">
          <Check className="size-5" />
          Séance confirmée
        </p>
        <h2 className="mt-3 font-heading text-3xl font-bold">
          {result.appointment.packageLabel}
        </h2>
        <p className="mt-4">{result.appointment.dateLabel}</p>
        <p className="mt-1 text-muted-foreground">
          {result.appointment.serviceLabel}
        </p>
        <p className="mt-1 text-muted-foreground">
          {result.appointment.priceLabel} ·{' '}
          {result.appointment.installmentLabel}
        </p>
        <p className="mt-3 font-medium text-primary">
          {result.appointment.remainingCredits} séance
          {result.appointment.remainingCredits > 1 ? 's' : ''} restante
          {result.appointment.remainingCredits > 1 ? 's' : ''}.
        </p>
        <ConfirmationActions appointment={result.appointment} />
      </section>
    )

  if (!selectedPackage)
    return (
      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        {packages.length === 0 ? (
          <section className="rounded-3xl border bg-card p-6 sm:col-span-2">
            <h2 className="font-heading text-xl font-semibold">
              Aucun forfait utilisable en ligne
            </h2>
            <p className="mt-2 text-muted-foreground">
              Vos forfaits sont peut-être terminés, expirés ou associés à un
              soin qui n’est plus réservable en ligne. Arzu peut vous aider si
              vous pensez qu’il reste une séance.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/mes-rendez-vous">Voir tous mes forfaits</Link>
            </Button>
          </section>
        ) : null}
        {packages.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setPackageId(item.id)
              setServiceId(
                item.services.length === 1 ? (item.services[0]?.id ?? '') : '',
              )
              setAvailability({})
              setStartsAt('')
              window.history.replaceState(
                window.history.state,
                '',
                `/reservation?type=mon-forfait&utiliserForfait=${encodeURIComponent(item.id)}`,
              )
            }}
            className="rounded-3xl border bg-card p-5 text-left transition hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="font-heading text-xl font-semibold">
              {item.name}
            </span>
            <span className="mt-2 block text-sm text-muted-foreground">
              {item.remainingCredits} séance
              {item.remainingCredits > 1 ? 's' : ''} restante
              {item.remainingCredits > 1 ? 's' : ''}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Prix total {formatPrice(item.priceCents)} ·{' '}
              {formatInstallmentChoice(item.installmentCount).toLowerCase()}
            </span>
          </button>
        ))}
      </div>
    )

  const submit = (formData: FormData) => {
    setResult(null)
    startSubmitting(async () => {
      const response = await createPublicCustomerPackageSession({
        customerPackageId: selectedPackage.id,
        serviceId,
        startsAt,
        comment: formData.get('comment'),
        consent: formData.get('consent') === 'on',
        website: formData.get('website'),
      })
      setResult(response)
    })
  }

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border bg-card p-5 sm:p-8">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setPackageId('')
          setServiceId('')
          setStartsAt('')
          window.history.replaceState(
            window.history.state,
            '',
            '/reservation?type=mon-forfait',
          )
        }}
        className="-ml-2"
      >
        <ChevronLeft className="size-4" />
        Changer de forfait
      </Button>
      <h2 className="mt-4 font-heading text-2xl font-bold">
        {selectedPackage.name}
      </h2>
      <p className="mt-2 text-muted-foreground">
        {selectedPackage.remainingCredits} séance
        {selectedPackage.remainingCredits > 1 ? 's' : ''} restante
        {selectedPackage.remainingCredits > 1 ? 's' : ''} sur{' '}
        {selectedPackage.sessionCount}
      </p>
      <div className="mt-4 rounded-2xl bg-muted/60 p-4 text-sm">
        <p>
          <strong>Prix total du forfait :</strong>{' '}
          {formatPrice(selectedPackage.priceCents)}
        </p>
        <p className="mt-1">
          <strong>Modalité choisie :</strong>{' '}
          {formatInstallmentChoice(
            selectedPackage.installmentCount,
          ).toLowerCase()}{' '}
          sur place
        </p>
        <p className="mt-2 text-muted-foreground">
          Ce choix concerne le règlement global du forfait. Les montants ne sont
          pas attribués automatiquement à chaque rendez-vous.
        </p>
      </div>
      {selectedPackage.expiresAt ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Valable jusqu’au {formatLongDate(new Date(selectedPackage.expiresAt))}
        </p>
      ) : null}
      {selectedPackage.pendingDecisions > 0 ? (
        <p className="mt-4 rounded-xl bg-warning-subtle p-3 text-sm text-warning-strong">
          Une séance annulée attend encore la décision de l’institut. Le solde
          affiché en tient compte provisoirement.
        </p>
      ) : null}
      {selectedPackage.services.length > 1 ? (
        <FormField
          controlId="customer-package-service"
          label="Soin de cette séance"
          className="mt-6"
        >
          <select
            id="customer-package-service"
            value={serviceId}
            onChange={event => {
              setServiceId(event.target.value)
              setAvailability({})
              setStartsAt('')
            }}
            className={formControlClass}
          >
            <option value="">Choisir un soin</option>
            {selectedPackage.services.map(service => (
              <option key={service.id} value={service.id}>
                {service.categoryName
                  ? `${service.categoryName} — ${service.name}`
                  : service.name}{' '}
                · {service.durationMinutes} min
              </option>
            ))}
          </select>
        </FormField>
      ) : null}
      {selectedService ? (
        <>
          <h3 className="mt-8 font-heading text-xl font-semibold">
            Choisir l’heure · {selectedService.name}
          </h3>
          <WeekAvailabilityPicker
            announcement={`Période du ${formatCalendarPeriod(viewStart, addLocalDays(viewStart, 6))} affichée.`}
            availability={availability}
            date={date}
            loading={loading}
            maxDate={effectiveMaxDate}
            minDate={minDate}
            onChangeWeek={amount => {
              const next = addLocalDays(viewStart, amount)
              setViewStart(
                next < minDate
                  ? minDate
                  : next > maxViewStart
                    ? maxViewStart
                    : next,
              )
              setStartsAt('')
            }}
            onSelectDate={key => {
              setDate(key)
              setStartsAt('')
            }}
            onSelectSlot={setStartsAt}
            ready={ready}
            startsAt={startsAt}
            viewStart={viewStart}
          />
        </>
      ) : null}
      <form action={submit} className="mt-8 space-y-4">
        <FormField
          controlId="customer-package-comment"
          label="Message"
          optional
        >
          <textarea
            id="customer-package-comment"
            name="comment"
            maxLength={1000}
            rows={3}
            className={formControlClass}
          />
        </FormField>
        <label className="sr-only" aria-hidden="true">
          Site web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-1 size-4"
          />
          <span>
            J’accepte que mes informations soient utilisées pour gérer ce
            rendez-vous.
          </span>
        </label>
        {result && !result.ok ? (
          <p
            className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {result.message}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!startsAt || !serviceId || submitting}
        >
          {submitting ? 'Confirmation…' : 'Confirmer cette séance'}
        </Button>
      </form>
    </section>
  )
}
