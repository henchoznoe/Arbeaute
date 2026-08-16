'use client'

import {
  Check,
  ChevronLeft,
  FileText,
  MailX,
  MapPin,
  Pencil,
  Phone,
  Settings2,
  UserRound,
  Zap,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { ServiceDetails } from '@/components/catalog/service-details'
import { BookingSummary } from '@/components/reservation/booking-summary'
import { ConfirmationActions } from '@/components/reservation/confirmation-actions'
import { WeekAvailabilityPicker } from '@/components/reservation/week-availability-picker'
import { Button } from '@/components/ui/button'
import { FormField, formControlClass } from '@/components/ui/form-field'
import {
  type BookingResult,
  createPublicAppointment,
  getNextPublicAvailableSlot,
  getPublicWeekAvailability,
} from '@/lib/actions/reservation'
import type { ServiceCareDetails } from '@/lib/catalog/service-content'
import { contact } from '@/lib/constants/contact'
import type { DayAvailability } from '@/lib/reservation/availability'
import {
  availabilityStateLabels,
  formatCalendarDate,
  formatCalendarPeriod,
} from '@/lib/reservation/calendar-view'
import {
  type CustomerFormErrors,
  type CustomerFormField,
  type CustomerFormValues,
  customerFieldOrder,
  emptyCustomerForm,
  normalizeCustomerFormDisplay,
  validateCustomerField,
  validateCustomerForm,
} from '@/lib/reservation/customer-form'
import {
  buildServiceReservationPath,
  resolveInitialServiceId,
} from '@/lib/reservation/deep-link'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import { formatAppointmentDate } from '@/lib/reservation/time'
import { cn } from '@/lib/utils/cn'
import { CancellationPolicy } from './cancellation-policy'

interface ReservationService extends ServiceCareDetails {
  id: string
  slug: string
  name: string
  description: string | null
  durationMinutes: number
  priceCents: number
  priceNote: string | null
  consentFormUrl: string | null
  categoryName: string
}

interface ReservationWizardProps {
  services: ReservationService[]
  minDate: string
  maxDate: string
  customerChangeCutoffLabel: string
}

const fieldClass = cn(formControlClass, 'min-h-12 px-4')

const formatPrice = (priceCents: number): string =>
  `${(priceCents / 100).toLocaleString('fr-CH')} CHF`

const addDateKeyDays = (dateKey: string, amount: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + amount))
    .toISOString()
    .slice(0, 10)
}

/** Identifie la semaine chargée : les créneaux dépendent aussi de la prestation. */
const weekCacheKey = (serviceId: string, weekStart: string): string =>
  `${serviceId}|${weekStart}`

const ConsentFormNotice = ({ url }: Readonly<{ url: string }>) => (
  <div className="mt-5 rounded-xl border border-warning-accent bg-warning-subtle p-4 text-sm text-warning-strong">
    <p className="flex items-start gap-2">
      <FileText className="mt-0.5 size-4 shrink-0" />
      <span>
        <strong className="font-semibold">
          Formulaire de consentement obligatoire.
        </strong>{' '}
        Cette prestation nécessite un formulaire à imprimer, remplir et apporter
        le jour du rendez-vous.
      </span>
    </p>
    <Button
      asChild
      variant="outline"
      className="mt-3 border-warning-accent bg-background"
    >
      <a href={url} target="_blank" rel="noopener noreferrer">
        <FileText className="size-4" />
        Télécharger le formulaire (PDF)
      </a>
    </Button>
  </div>
)

export const ReservationWizard = ({
  services,
  minDate,
  maxDate,
  customerChangeCutoffLabel,
}: Readonly<ReservationWizardProps>) => {
  const searchParams = useSearchParams()
  const requestedServiceSlug = searchParams.get('service')
  const initialServiceId = resolveInitialServiceId(
    services,
    requestedServiceSlug,
  )
  const deepLinkSelectionKey = `${requestedServiceSlug ?? ''}:${initialServiceId ?? ''}`
  const [step, setStep] = useState(initialServiceId ? 2 : 1)
  const [serviceId, setServiceId] = useState(initialServiceId ?? '')
  const [date, setDate] = useState(minDate)
  const [weekAvailability, setWeekAvailability] = useState<
    Record<string, DayAvailability>
  >({})
  const [loadedWeek, setLoadedWeek] = useState<string | null>(null)
  const [startsAt, setStartsAt] = useState('')
  const [loadingSlots, startSlotsTransition] = useTransition()
  const [submitting, startSubmitTransition] = useTransition()
  const [searchingNext, startNextTransition] = useTransition()
  const [nextSlotNotice, setNextSlotNotice] = useState<string | null>(null)
  const [calendarAnnouncement, setCalendarAnnouncement] = useState('')
  const [result, setResult] = useState<BookingResult | null>(null)
  const [customer, setCustomer] =
    useState<CustomerFormValues>(emptyCustomerForm)
  const [customerErrors, setCustomerErrors] = useState<CustomerFormErrors>({})
  const [website, setWebsite] = useState('')
  const [viewStart, setViewStart] = useState(minDate)
  const wizardRef = useRef<HTMLElement>(null)
  const customerFormRef = useRef<HTMLFormElement>(null)
  const pendingSlotRef = useRef<{ dateKey: string; startsAt: string } | null>(
    null,
  )
  const synchronizedDeepLinkRef = useRef(deepLinkSelectionKey)
  const selectedService = services.find(service => service.id === serviceId)
  const weekEnd = addDateKeyDays(viewStart, 6)
  const lastCompleteWeekStart = addDateKeyDays(maxDate, -6)
  const maxViewStart =
    lastCompleteWeekStart < minDate ? minDate : lastCompleteWeekStart
  const weekReady = loadedWeek === weekCacheKey(serviceId, viewStart)

  const scrollToWizardTop = useCallback(() => {
    const wizard = wizardRef.current
    if (!wizard) return
    const target = wizard.getBoundingClientRect().top + window.scrollY - 80
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches
      ? 'auto'
      : 'smooth'
    requestAnimationFrame(() =>
      window.scrollTo({ top: Math.max(0, target), behavior }),
    )
  }, [])

  const goToStep = useCallback(
    (nextStep: number) => {
      setStep(nextStep)
      scrollToWizardTop()
    },
    [scrollToWizardTop],
  )

  const goToWeek = (amount: number) => {
    const candidate = addDateKeyDays(viewStart, amount)
    const next =
      candidate < minDate
        ? minDate
        : candidate > maxViewStart
          ? maxViewStart
          : candidate
    setViewStart(next)
    setDate(next)
    setStartsAt('')
    setNextSlotNotice(null)
    setCalendarAnnouncement(
      `Période du ${formatCalendarPeriod(next, addDateKeyDays(next, 6))} affichée.`,
    )
  }

  const selectDate = (dateKey: string) => {
    setDate(dateKey)
    setStartsAt('')
    setNextSlotNotice(null)
    setResult(null)
    const state = weekAvailability[dateKey]?.state
    setCalendarAnnouncement(
      `${formatCalendarDate(dateKey)} sélectionné${
        state ? ` : ${availabilityStateLabels[state].toLowerCase()}` : ''
      }.`,
    )
  }

  const selectService = (service: ReservationService) => {
    window.history.replaceState(
      window.history.state,
      '',
      buildServiceReservationPath(service.slug),
    )
    setServiceId(service.id)
    setDate(minDate)
    setViewStart(minDate)
    setStartsAt('')
    setNextSlotNotice(null)
    setResult(null)
    goToStep(2)
  }

  // L'état React peut survivre à une navigation cliente vers la même route.
  // On resynchronise donc le tunnel avec l'URL au lieu de ne lire le slug
  // qu'une seule fois lors de l'initialisation des useState.
  useEffect(() => {
    // Une action serveur peut recréer le tableau `services` sans changer son
    // contenu. Seule cette clé stable doit alors pouvoir réinitialiser l'étape.
    if (synchronizedDeepLinkRef.current === deepLinkSelectionKey) return
    synchronizedDeepLinkRef.current = deepLinkSelectionKey

    if (requestedServiceSlug === null || initialServiceId === null) {
      setServiceId('')
      setStartsAt('')
      goToStep(1)
      return
    }

    setServiceId(initialServiceId)
    setDate(minDate)
    setViewStart(minDate)
    setStartsAt('')
    setNextSlotNotice(null)
    goToStep(2)
  }, [
    deepLinkSelectionKey,
    goToStep,
    initialServiceId,
    minDate,
    requestedServiceSlug,
  ])

  // Une seule requête par semaine affichée : passer d'un jour à l'autre à
  // l'intérieur de la semaine ne touche plus le serveur.
  useEffect(() => {
    if (step !== 2 || !serviceId) return
    startSlotsTransition(async () => {
      const loaded = await getPublicWeekAvailability(serviceId, viewStart)
      const pending = pendingSlotRef.current
      pendingSlotRef.current = null

      setWeekAvailability(loaded)
      setLoadedWeek(weekCacheKey(serviceId, viewStart))
      setStartsAt(current => {
        const candidate = pending?.startsAt ?? current
        const stillAvailable = Object.values(loaded).some(day =>
          day.slots.some(slot => slot.startsAt === candidate),
        )
        return stillAvailable ? candidate : ''
      })
    })
  }, [serviceId, step, viewStart])

  const findNextSlot = () => {
    if (!serviceId) return
    setNextSlotNotice(null)
    startNextTransition(async () => {
      const found = await getNextPublicAvailableSlot(serviceId, date)
      if (!found) {
        setNextSlotNotice(
          'Aucun créneau disponible dans les prochains mois pour cette prestation.',
        )
        return
      }

      setDate(found.dateKey)
      const foundNotice = `Prochain créneau trouvé : ${formatCalendarDate(
        found.dateKey,
      )} à ${found.slot.label}.`
      setNextSlotNotice(foundNotice)
      if (found.dateKey >= viewStart && found.dateKey <= weekEnd) {
        setStartsAt(found.slot.startsAt)
        return
      }

      // La semaine change : le créneau sera sélectionné une fois chargée.
      pendingSlotRef.current = {
        dateKey: found.dateKey,
        startsAt: found.slot.startsAt,
      }
      setViewStart(found.dateKey > maxViewStart ? maxViewStart : found.dateKey)
    })
  }

  const updateCustomerField = <Field extends CustomerFormField>(
    field: Field,
    value: CustomerFormValues[Field],
  ) => {
    const next = { ...customer, [field]: value }
    setCustomer(next)
    if (customerErrors[field]) {
      const error = validateCustomerField(field, next)
      setCustomerErrors(current => ({
        ...current,
        [field]: error ?? undefined,
      }))
    }
  }

  const validateCustomerOnBlur = (field: CustomerFormField) => {
    const error = validateCustomerField(field, customer)
    setCustomerErrors(current => ({
      ...current,
      [field]: error ?? undefined,
    }))
  }

  const reviewBooking = () => {
    const errors = validateCustomerForm(customer)
    setCustomerErrors(errors)
    const firstInvalidField = customerFieldOrder.find(field => errors[field])
    if (firstInvalidField) {
      requestAnimationFrame(() => {
        const element =
          customerFormRef.current?.elements.namedItem(firstInvalidField)
        if (element instanceof HTMLElement) element.focus()
      })
      return
    }

    setCustomer(normalizeCustomerFormDisplay(customer))
    setResult(null)
    goToStep(4)
  }

  const submitBooking = () => {
    setResult(null)
    startSubmitTransition(async () => {
      const response = await createPublicAppointment({
        serviceId,
        startsAt,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        comment: customer.comment,
        consent: customer.consent,
        website,
      })
      setResult(response)
      if (response.ok) {
        scrollToWizardTop()
        return
      }
      if (response.reason === 'SLOT_CONFLICT') {
        setStartsAt('')
        goToStep(2)
      } else if (response.reason === 'INVALID_CUSTOMER') goToStep(3)
    })
  }

  if (result?.appointment)
    return (
      <section
        ref={wizardRef}
        data-print-receipt
        className="mx-auto max-w-xl rounded-3xl border bg-card p-6 text-center shadow-sm sm:p-10"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <Check className="size-7" />
        </div>
        <p className="mt-5 text-sm font-semibold tracking-widest text-success uppercase">
          Rendez-vous confirmé
        </p>
        <h2 className="mt-2 font-heading text-title font-bold">
          Votre rendez-vous est bien enregistré
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Votre créneau est réservé chez Arbeauté. Vous n’avez rien d’autre à
          faire pour le confirmer.
        </p>
        <div className="mt-6 rounded-2xl bg-muted p-5 text-left">
          <p className="font-semibold">{result.appointment.serviceName}</p>
          <p className="mt-2 text-sm capitalize">
            {result.appointment.dateLabel}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.appointment.priceLabel}
          </p>
          <div className="mt-4 space-y-2 border-t pt-4 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              {contact.address}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 shrink-0" />
              {contact.phone}
            </p>
          </div>
        </div>
        {selectedService?.consentFormUrl ? (
          <div className="text-left">
            <ConsentFormNotice url={selectedService.consentFormUrl} />
          </div>
        ) : null}
        <div className="mt-5 rounded-2xl border border-warning-accent bg-warning-subtle p-5 text-left text-warning-strong">
          <p className="flex items-start gap-3 font-semibold">
            <MailX className="mt-0.5 size-5 shrink-0" />
            Aucun e-mail de confirmation ne sera envoyé
          </p>
          <p className="mt-2 pl-8 text-sm leading-relaxed">
            Cet écran confirme définitivement votre réservation. Pensez à
            ajouter le rendez-vous à votre calendrier ci-dessous.
          </p>
        </div>

        <ConfirmationActions appointment={result.appointment} />

        <div className="mt-5 rounded-2xl border p-5 text-left" data-no-print>
          <p className="flex items-start gap-3 font-semibold">
            <Settings2 className="mt-0.5 size-5 shrink-0 text-primary" />
            Modifier ou annuler ce rendez-vous
          </p>
          <p className="mt-2 pl-8 text-sm leading-relaxed text-muted-foreground">
            Retrouvez-le maintenant dans « Mes rendez-vous ». Lors d’une
            prochaine visite, utilisez exactement l’adresse e-mail et le numéro
            de téléphone saisis lors de la réservation.
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <a href="/mes-rendez-vous">Accéder à mes rendez-vous</a>
          </Button>
        </div>
      </section>
    )

  return (
    <section ref={wizardRef} className="mx-auto max-w-3xl">
      <ol
        className="mb-5 grid grid-cols-4 gap-1 sm:mb-8 sm:gap-2"
        aria-label="Étapes"
      >
        {['Prestation', 'Créneau', 'Coordonnées', 'Vérification'].map(
          (label, index) => {
            const number = index + 1
            const canGoBack = step > number
            const active = step >= number
            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={!canGoBack}
                  onClick={() => goToStep(number)}
                  aria-current={step === number ? 'step' : undefined}
                  className={cn(
                    'flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl border px-0.5 py-2 text-center transition sm:min-h-0 sm:flex-row sm:gap-2 sm:rounded-full sm:px-3 sm:py-2.5',
                    active &&
                      'border-primary bg-primary text-primary-foreground',
                    canGoBack ? 'cursor-pointer' : 'cursor-default',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
                      active ? 'bg-primary-foreground/20' : 'bg-foreground/10',
                    )}
                  >
                    {number}
                  </span>
                  <span className="text-2xs leading-tight font-medium text-balance sm:text-sm">
                    {label}
                  </span>
                </button>
              </li>
            )
          },
        )}
      </ol>

      {selectedService && step >= 2 ? (
        <BookingSummary
          service={selectedService}
          startsAt={startsAt}
          sticky={step === 2 || step === 3}
          className="mb-5"
        />
      ) : null}

      {step === 1 ? (
        <div className="space-y-8">
          {[...new Set(services.map(service => service.categoryName))].map(
            category => (
              <div key={category}>
                <h2 className="font-heading text-xl font-bold">{category}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {services
                    .filter(service => service.categoryName === category)
                    .map(service => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => selectService(service)}
                        className="rounded-2xl border bg-card p-5 text-left transition hover:border-primary hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block font-semibold">
                          {service.name}
                        </span>
                        <span className="mt-2 flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">
                            {service.durationMinutes} min
                          </span>
                          <span className="font-semibold text-price">
                            {formatPrice(service.priceCents)}
                          </span>
                        </span>
                        {service.description ? (
                          <span className="mt-3 line-clamp-2 block text-xs text-muted-foreground">
                            {service.description}
                          </span>
                        ) : null}
                      </button>
                    ))}
                </div>
              </div>
            ),
          )}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="rounded-3xl border bg-card p-5 sm:p-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => goToStep(1)}
            className="-ml-2"
          >
            <ChevronLeft className="size-4" /> Changer de prestation
          </Button>
          <h2 className="mt-5 font-heading text-2xl font-bold">
            Choisissez votre créneau
          </h2>
          {selectedService ? (
            <ServiceDetails
              service={selectedService}
              className="mt-4 rounded-xl border px-4 pt-0 [&>summary]:pt-1"
            />
          ) : null}

          {result?.reason === 'SLOT_CONFLICT' ? (
            <p
              className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              {result.message}
            </p>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            onClick={findNextSlot}
            disabled={searchingNext}
            className="mt-5 w-full sm:w-auto"
          >
            <Zap className="size-4 shrink-0" />
            {searchingNext ? 'Recherche…' : 'Prochain créneau disponible'}
          </Button>
          {nextSlotNotice ? (
            <p className="mt-2 text-sm text-muted-foreground" role="status">
              {nextSlotNotice}
            </p>
          ) : null}

          <WeekAvailabilityPicker
            announcement={calendarAnnouncement}
            availability={weekAvailability}
            date={date}
            loading={loadingSlots}
            maxDate={maxDate}
            minDate={minDate}
            onChangeWeek={goToWeek}
            onSelectDate={selectDate}
            onSelectSlot={slot => {
              setStartsAt(slot)
              setResult(null)
            }}
            ready={weekReady}
            startsAt={startsAt}
            viewStart={viewStart}
          />
          <Button
            type="button"
            size="lg"
            disabled={!startsAt}
            onClick={() => goToStep(3)}
            className="mt-7 w-full"
          >
            Continuer
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <form
          ref={customerFormRef}
          noValidate
          onSubmit={event => {
            event.preventDefault()
            reviewBooking()
          }}
          className="rounded-3xl border bg-card p-5 sm:p-8"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => goToStep(2)}
            className="-ml-2"
          >
            <ChevronLeft className="size-4" /> Changer de créneau
          </Button>
          <h2 className="mt-5 font-heading text-2xl font-bold">
            Vos coordonnées
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aucun e-mail de confirmation ne sera envoyé. Votre e-mail et votre
            téléphone serviront à retrouver, modifier ou annuler ce rendez-vous
            dans « Mes rendez-vous ».
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <FormField
              controlId="firstName"
              label="Prénom"
              error={customerErrors.firstName}
              errorId="firstName-error"
            >
              <input
                id="firstName"
                name="firstName"
                value={customer.firstName}
                onChange={event =>
                  updateCustomerField('firstName', event.target.value)
                }
                onBlur={() => validateCustomerOnBlur('firstName')}
                maxLength={100}
                autoComplete="given-name"
                aria-invalid={Boolean(customerErrors.firstName)}
                aria-describedby={
                  customerErrors.firstName ? 'firstName-error' : undefined
                }
                className={fieldClass}
              />
            </FormField>
            <FormField
              controlId="lastName"
              label="Nom"
              error={customerErrors.lastName}
              errorId="lastName-error"
            >
              <input
                id="lastName"
                name="lastName"
                value={customer.lastName}
                onChange={event =>
                  updateCustomerField('lastName', event.target.value)
                }
                onBlur={() => validateCustomerOnBlur('lastName')}
                maxLength={100}
                autoComplete="family-name"
                aria-invalid={Boolean(customerErrors.lastName)}
                aria-describedby={
                  customerErrors.lastName ? 'lastName-error' : undefined
                }
                className={fieldClass}
              />
            </FormField>
            <FormField
              controlId="email"
              label="Adresse e-mail"
              error={customerErrors.email}
              errorId="email-error"
            >
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                value={customer.email}
                onChange={event =>
                  updateCustomerField('email', event.target.value)
                }
                onBlur={() => validateCustomerOnBlur('email')}
                autoComplete="email"
                spellCheck={false}
                aria-invalid={Boolean(customerErrors.email)}
                aria-describedby={
                  customerErrors.email ? 'email-error' : undefined
                }
                className={fieldClass}
              />
            </FormField>
            <FormField
              controlId="phone"
              label="Téléphone"
              error={customerErrors.phone}
              errorId="phone-error"
              helpId="phone-help"
              help="Les espaces sont acceptés. Avant confirmation, le numéro sera présenté au format international, par exemple +41 79 123 45 67."
            >
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                value={customer.phone}
                onChange={event =>
                  updateCustomerField('phone', event.target.value)
                }
                onBlur={() => validateCustomerOnBlur('phone')}
                autoComplete="tel"
                placeholder="079 123 45 67"
                aria-invalid={Boolean(customerErrors.phone)}
                aria-describedby={
                  customerErrors.phone ? 'phone-help phone-error' : 'phone-help'
                }
                className={fieldClass}
              />
            </FormField>
          </div>
          <FormField
            controlId="comment"
            label="Commentaire"
            optional
            className="mt-4"
            error={customerErrors.comment}
            errorId="comment-error"
          >
            <textarea
              id="comment"
              name="comment"
              value={customer.comment}
              onChange={event =>
                updateCustomerField('comment', event.target.value)
              }
              onBlur={() => validateCustomerOnBlur('comment')}
              rows={4}
              maxLength={1000}
              aria-invalid={Boolean(customerErrors.comment)}
              aria-describedby={
                customerErrors.comment ? 'comment-error' : undefined
              }
              className={cn(fieldClass, 'py-3')}
            />
          </FormField>
          <label className="sr-only" aria-hidden="true">
            Site web
            <input
              name="website"
              value={website}
              onChange={event => setWebsite(event.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
          <label className="mt-5 flex items-start gap-3 text-sm">
            <input
              name="consent"
              type="checkbox"
              checked={customer.consent}
              onChange={event =>
                updateCustomerField('consent', event.target.checked)
              }
              onBlur={() => validateCustomerOnBlur('consent')}
              aria-invalid={Boolean(customerErrors.consent)}
              aria-describedby={
                customerErrors.consent ? 'consent-error' : undefined
              }
              className="mt-1 size-4"
            />
            <span>
              J’accepte que mes données soient utilisées pour gérer mon
              rendez-vous, conformément à la{' '}
              <a href="/politique-de-confidentialite" className="underline">
                politique de confidentialité
              </a>{' '}
              et aux{' '}
              <a href="/conditions-generales" className="underline">
                conditions générales
              </a>
              .
            </span>
          </label>
          {customerErrors.consent ? (
            <p
              id="consent-error"
              className="mt-2 text-xs text-destructive"
              role="alert"
            >
              {customerErrors.consent}
            </p>
          ) : null}
          {selectedService?.consentFormUrl ? (
            <ConsentFormNotice url={selectedService.consentFormUrl} />
          ) : null}

          <CancellationPolicy
            className="mt-5"
            cutoffLabel={customerChangeCutoffLabel}
          />

          {result && !result.ok ? (
            <p
              className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              {result.message}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="mt-6 w-full">
            Vérifier mes informations
          </Button>
        </form>
      ) : null}

      {step === 4 && selectedService ? (
        <section className="rounded-3xl border bg-card p-5 sm:p-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => goToStep(3)}
            className="-ml-2"
          >
            <ChevronLeft className="size-4" /> Modifier mes coordonnées
          </Button>
          <h2 className="mt-5 font-heading text-2xl font-bold">
            Vérifiez votre réservation
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rien n’est encore créé. Relisez ces informations avant la
            confirmation définitive.
          </p>

          <div className="mt-6 divide-y rounded-2xl border">
            <div className="flex items-start justify-between gap-4 p-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Prestation
                </p>
                <p className="mt-1 font-semibold">
                  {formatServiceLabel(
                    selectedService.name,
                    selectedService.categoryName,
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedService.durationMinutes} min ·{' '}
                  {formatPrice(selectedService.priceCents)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goToStep(1)}
                className="min-h-11 shrink-0 rounded-full"
              >
                <Pencil className="size-3.5" /> Modifier
              </Button>
            </div>
            <div className="flex items-start justify-between gap-4 p-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Créneau
                </p>
                <p className="mt-1 font-semibold capitalize">
                  {formatAppointmentDate(new Date(startsAt))}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goToStep(2)}
                className="min-h-11 shrink-0 rounded-full"
              >
                <Pencil className="size-3.5" /> Modifier
              </Button>
            </div>
            <div className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <UserRound className="size-3.5" /> Coordonnées
                </p>
                <p className="mt-1 font-semibold">
                  {customer.firstName} {customer.lastName}
                </p>
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {customer.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  {customer.phone}
                </p>
                {customer.comment ? (
                  <p className="mt-2 text-sm">« {customer.comment} »</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goToStep(3)}
                className="min-h-11 shrink-0 rounded-full"
              >
                <Pencil className="size-3.5" /> Modifier
              </Button>
            </div>
          </div>

          <CancellationPolicy
            className="mt-5"
            cutoffLabel={customerChangeCutoffLabel}
          />

          {result && !result.ok ? (
            <p
              className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              {result.message}
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            onClick={submitBooking}
            disabled={submitting}
            className="mt-6 w-full"
          >
            {submitting
              ? 'Création du rendez-vous…'
              : 'Confirmer et créer le rendez-vous'}
          </Button>
        </section>
      ) : null}
    </section>
  )
}
