'use client'

import { Check, ChevronLeft, Mail } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ConfirmationActions } from '@/components/reservation/confirmation-actions'
import { WeekAvailabilityPicker } from '@/components/reservation/week-availability-picker'
import { Button } from '@/components/ui/button'
import { FormField, formControlClass } from '@/components/ui/form-field'
import {
  createPublicPackageBooking,
  type PackageBookingResult,
} from '@/lib/actions/packages'
import {
  getPublicWeekAvailability,
  lookupCustomerByEmail,
} from '@/lib/actions/reservation'
import type { PublicPackage } from '@/lib/packages/queries'
import type { DayAvailability } from '@/lib/reservation/availability'
import { formatCalendarPeriod } from '@/lib/reservation/calendar-view'
import { addLocalDays } from '@/lib/reservation/time'
import { formatPrice } from '@/lib/utils/format'

export const PackageReservationWizard = ({
  packages,
  requestedSlug,
  minDate,
  maxDate,
}: Readonly<{
  packages: PublicPackage[]
  requestedSlug: string | null
  minDate: string
  maxDate: string
}>) => {
  const initial = packages.find(item => item.slug === requestedSlug) ?? null
  const [packageId, setPackageId] = useState(initial?.id ?? '')
  const selectedPackage = packages.find(item => item.id === packageId)
  const [serviceId, setServiceId] = useState(
    initial?.services.length === 1 ? (initial.services[0]?.id ?? '') : '',
  )
  const [installmentCount, setInstallmentCount] = useState(1)
  const [viewStart, setViewStart] = useState(minDate)
  const [date, setDate] = useState(minDate)
  const [startsAt, setStartsAt] = useState('')
  const [availability, setAvailability] = useState<
    Record<string, DayAvailability>
  >({})
  const [loading, startLoading] = useTransition()
  const [submitting, startSubmitting] = useTransition()
  const [checkingEmail, startEmailCheck] = useTransition()
  const [hydrated, setHydrated] = useState(false)
  const [email, setEmail] = useState('')
  const [detailsStage, setDetailsStage] = useState<
    'email' | 'known' | 'identity'
  >('email')
  const [result, setResult] = useState<PackageBookingResult | null>(null)
  const availabilityRequest = useRef(0)
  const selectedService = selectedPackage?.services.find(
    service => service.id === serviceId,
  )
  const maxViewStart =
    addLocalDays(maxDate, -6) < minDate ? minDate : addLocalDays(maxDate, -6)
  const ready = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addLocalDays(viewStart, index),
      ).every(key => Boolean(availability[key])),
    [availability, viewStart],
  )

  useEffect(() => {
    setHydrated(true)
  }, [])

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
            slots: day.slots.filter(slot => slot.state === 'OPEN'),
            state: day.slots.some(slot => slot.state === 'OPEN')
              ? 'AVAILABLE'
              : day.state === 'CLOSED'
                ? 'CLOSED'
                : 'FULL',
          },
        ]),
      ) as Record<string, DayAvailability>
      setAvailability(current => ({ ...current, ...bookableOnly }))
      const first = Array.from({ length: 7 }, (_, index) =>
        addLocalDays(viewStart, index),
      ).find(key => bookableOnly[key]?.slots.length)
      if (first) setDate(first)
    })
  }, [serviceId, viewStart])

  if (result?.appointment)
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border bg-card p-6 sm:p-9">
        <p className="flex items-center gap-2 font-semibold text-success">
          <Check className="size-5" />
          Forfait confirmé
        </p>
        <h2 className="mt-3 font-heading text-3xl font-bold">
          {result.appointment.packageLabel}
        </h2>
        <p className="mt-4">
          Premier rendez-vous : {result.appointment.dateLabel}
        </p>
        <p className="mt-1 text-muted-foreground">
          {result.appointment.serviceLabel}
        </p>
        <p className="mt-1 text-muted-foreground">
          {result.appointment.priceLabel} ·{' '}
          {result.appointment.installmentLabel}
        </p>
        {result.appointment.remainingCredits > 0 ? (
          <p className="mt-3 font-medium text-primary">
            {result.appointment.remainingCredits} séance
            {result.appointment.remainingCredits > 1 ? 's' : ''} encore
            disponible{result.appointment.remainingCredits > 1 ? 's' : ''} dans
            « Mes rendez-vous ».
          </p>
        ) : (
          <p className="mt-3 font-medium text-primary">
            Cette séance termine le forfait.
          </p>
        )}
        <ConfirmationActions appointment={result.appointment} />
      </section>
    )

  if (!selectedPackage)
    return (
      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        {packages.length === 0 ? (
          <div className="rounded-3xl border bg-card p-6 sm:col-span-2">
            <h2 className="font-heading text-xl font-semibold">
              Les forfaits arrivent bientôt
            </h2>
            <p className="mt-2 text-muted-foreground">
              En attendant, toutes les prestations restent réservables
              séparément.
            </p>
          </div>
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
                `/reservation?forfait=${encodeURIComponent(item.slug)}`,
              )
            }}
            className="rounded-3xl border bg-card p-5 text-left transition hover:border-primary"
          >
            <span className="font-heading text-xl font-semibold">
              {item.name}
            </span>
            <span className="mt-2 block text-sm text-muted-foreground">
              {item.sessionCount} séances · prix total{' '}
              {formatPrice(item.priceCents)}
            </span>
          </button>
        ))}
      </div>
    )

  const submit = (formData: FormData) => {
    setResult(null)
    startSubmitting(async () => {
      const response = await createPublicPackageBooking({
        packageId: selectedPackage.id,
        serviceId,
        startsAt,
        installmentCount,
        firstName: formData.get('firstName') ?? undefined,
        lastName: formData.get('lastName') ?? undefined,
        email,
        phone: formData.get('phone') ?? undefined,
        comment: formData.get('comment'),
        consent: formData.get('consent') === 'on',
        website: formData.get('website'),
      })
      setResult(response)
      if (response.reason === 'INVALID_CUSTOMER') setDetailsStage('identity')
    })
  }

  const checkEmail = (formData: FormData) => {
    const value = String(formData.get('email') ?? '').trim()
    setEmail(value)
    setResult(null)
    startEmailCheck(async () => {
      const { known } = await lookupCustomerByEmail(value)
      setDetailsStage(known ? 'known' : 'identity')
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
            '/reservation?type=forfait',
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
        {selectedPackage.sessionCount} séances · prix total{' '}
        {formatPrice(selectedPackage.priceCents)} · valable{' '}
        {selectedPackage.validityMonths} mois
      </p>
      {selectedPackage.services.length > 1 ? (
        <FormField
          controlId="package-service"
          label="Zone du premier rendez-vous"
          className="mt-6"
        >
          <select
            id="package-service"
            value={serviceId}
            onChange={event => {
              setServiceId(event.target.value)
              setAvailability({})
              setStartsAt('')
            }}
            className={formControlClass}
          >
            <option value="">Choisir une zone</option>
            {selectedPackage.services.map(service => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.durationMinutes} min
              </option>
            ))}
          </select>
        </FormField>
      ) : null}
      <fieldset className="mt-6">
        <legend className="font-medium">Paiement sur place</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[1, 2, 3].map(count => (
            <label
              key={count}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border p-2 text-sm whitespace-nowrap"
            >
              <input
                type="radio"
                name="installments"
                checked={installmentCount === count}
                onChange={() => setInstallmentCount(count)}
              />
              En {count} fois
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce choix concerne le règlement global du forfait sur place. Il ne
          répartit pas automatiquement le prix entre les rendez-vous.
        </p>
      </fieldset>
      {selectedService ? (
        <>
          <h3 className="mt-8 font-heading text-xl font-semibold">
            Premier rendez-vous · {selectedService.name}
          </h3>
          <WeekAvailabilityPicker
            announcement={`Période du ${formatCalendarPeriod(viewStart, addLocalDays(viewStart, 6))} affichée.`}
            availability={availability}
            date={date}
            loading={loading}
            maxDate={maxDate}
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
      {detailsStage === 'email' ? (
        <form action={checkEmail} className="mt-8 space-y-4">
          <h3 className="font-heading text-xl font-semibold">
            Votre adresse e-mail
          </h3>
          <p className="text-sm text-muted-foreground">
            Elle suffit si vous avez déjà réservé chez Arbeauté.
          </p>
          <FormField controlId="package-email" label="Adresse e-mail">
            <input
              id="package-email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              className={formControlClass}
            />
          </FormField>
          <Button
            type="submit"
            disabled={!hydrated || checkingEmail}
            className="w-full"
          >
            <Mail className="size-4" />
            {checkingEmail ? 'Vérification…' : 'Continuer'}
          </Button>
        </form>
      ) : (
        <form action={submit} className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-heading text-xl font-semibold">
                {detailsStage === 'known'
                  ? 'Adresse reconnue'
                  : 'Vos coordonnées'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{email}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDetailsStage('email')
                setResult(null)
              }}
            >
              Changer d’adresse
            </Button>
          </div>
          {detailsStage === 'identity' ? (
            <>
              <p className="text-sm text-muted-foreground">
                Cette adresse n’est pas encore connue. Complétez vos coordonnées
                une seule fois.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField controlId="package-first-name" label="Prénom">
                  <input
                    id="package-first-name"
                    name="firstName"
                    required
                    maxLength={100}
                    autoComplete="given-name"
                    className={formControlClass}
                  />
                </FormField>
                <FormField controlId="package-last-name" label="Nom">
                  <input
                    id="package-last-name"
                    name="lastName"
                    required
                    maxLength={100}
                    autoComplete="family-name"
                    className={formControlClass}
                  />
                </FormField>
              </div>
              <FormField controlId="package-phone" label="Téléphone">
                <input
                  id="package-phone"
                  name="phone"
                  type="tel"
                  required
                  maxLength={40}
                  autoComplete="tel"
                  className={formControlClass}
                />
              </FormField>
            </>
          ) : null}
          <FormField
            controlId="package-comment"
            label="Un mot pour Arzu"
            optional
          >
            <textarea
              id="package-comment"
              name="comment"
              maxLength={1000}
              className={formControlClass}
            />
          </FormField>
          <label className="sr-only" aria-hidden="true">
            Site web
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <label className="flex items-start gap-3 rounded-xl border p-4">
            <input type="checkbox" name="consent" required />
            <span className="text-sm">
              J’accepte les conditions générales et confirme les informations
              saisies.
            </span>
          </label>
          {result && !result.ok ? (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
            >
              {result.message}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            disabled={!serviceId || !startsAt || submitting}
            className="w-full"
          >
            {submitting
              ? 'Confirmation…'
              : 'Confirmer le forfait et le rendez-vous'}
          </Button>
        </form>
      )}
    </section>
  )
}
