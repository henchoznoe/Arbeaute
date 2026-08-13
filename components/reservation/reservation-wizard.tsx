'use client'

import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Download,
  FileText,
  MailX,
  Minus,
  Settings2,
  X,
  Zap,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { ServiceDetails } from '@/components/catalog/service-details'
import {
  type BookingResult,
  createPublicAppointment,
  getNextPublicAvailableSlot,
  getPublicWeekAvailability,
} from '@/lib/actions/reservation'
import type { ServiceCareDetails } from '@/lib/catalog/service-content'
import type {
  AvailabilityDayState,
  DayAvailability,
} from '@/lib/reservation/availability'
import {
  availabilityStateLabels,
  formatCalendarDate,
  formatCalendarDayNumber,
  formatCalendarPeriod,
  formatCalendarWeekday,
} from '@/lib/reservation/calendar-view'
import {
  buildServiceReservationPath,
  resolveInitialServiceId,
} from '@/lib/reservation/deep-link'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import { cn } from '@/lib/utils/cn'
import { downloadCalendar } from './calendar-download'
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
}

const fieldClass =
  'h-12 w-full rounded-xl border bg-background px-4 text-base outline-none transition focus:ring-2 focus:ring-ring'

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

const stateIcon = {
  AVAILABLE: CircleCheck,
  FULL: X,
  CLOSED: Minus,
} satisfies Record<AvailabilityDayState, typeof CircleCheck>

const ConsentFormNotice = ({ url }: Readonly<{ url: string }>) => (
  <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
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
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-amber-400 bg-white px-4 font-medium"
    >
      <FileText className="size-4" />
      Télécharger le formulaire (PDF)
    </a>
  </div>
)

export const ReservationWizard = ({
  services,
  minDate,
  maxDate,
}: Readonly<ReservationWizardProps>) => {
  const searchParams = useSearchParams()
  const requestedServiceSlug = searchParams.get('service')
  const initialServiceId = resolveInitialServiceId(
    services,
    requestedServiceSlug,
  )
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
  const [viewStart, setViewStart] = useState(minDate)
  const pendingSlotRef = useRef<{ dateKey: string; startsAt: string } | null>(
    null,
  )
  const selectedService = services.find(service => service.id === serviceId)
  const weekEnd = addDateKeyDays(viewStart, 6)
  const lastCompleteWeekStart = addDateKeyDays(maxDate, -6)
  const maxViewStart =
    lastCompleteWeekStart < minDate ? minDate : lastCompleteWeekStart
  const weekDates = Array.from({ length: 7 }, (_, index) =>
    addDateKeyDays(viewStart, index),
  )
  const canGoPreviousWeek = viewStart > minDate
  const canGoNextWeek = viewStart < maxViewStart
  const weekReady = loadedWeek === weekCacheKey(serviceId, viewStart)
  const selectedDay = weekAvailability[date]
  const slots = selectedDay?.slots ?? []

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
    setStep(2)
  }

  // L'état React peut survivre à une navigation cliente vers la même route.
  // On resynchronise donc le tunnel avec l'URL au lieu de ne lire le slug
  // qu'une seule fois lors de l'initialisation des useState.
  useEffect(() => {
    if (requestedServiceSlug === null) return
    const linkedServiceId = resolveInitialServiceId(
      services,
      requestedServiceSlug,
    )
    if (linkedServiceId === null) {
      setServiceId('')
      setStartsAt('')
      setStep(1)
      return
    }

    setServiceId(linkedServiceId)
    setDate(minDate)
    setViewStart(minDate)
    setStartsAt('')
    setNextSlotNotice(null)
    setStep(2)
  }, [minDate, requestedServiceSlug, services])

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
      setStartsAt(
        pending?.startsAt &&
          loaded[pending.dateKey]?.slots.some(
            slot => slot.startsAt === pending.startsAt,
          )
          ? pending.startsAt
          : '',
      )
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

  const submitBooking = (formData: FormData) => {
    setResult(null)
    startSubmitTransition(async () => {
      const response = await createPublicAppointment({
        serviceId,
        startsAt,
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        comment: formData.get('comment'),
        consent: formData.get('consent') === 'on',
        website: formData.get('website'),
      })
      setResult(response)
      if (response.ok) setStep(4)
    })
  }

  if (step === 4 && result?.appointment)
    return (
      <section className="mx-auto max-w-xl rounded-3xl border bg-card p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="size-7" />
        </div>
        <p className="mt-5 text-sm font-semibold tracking-widest text-emerald-700 uppercase">
          Rendez-vous confirmé
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold">
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
        </div>
        <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-left text-amber-950">
          <p className="flex items-start gap-3 font-semibold">
            <MailX className="mt-0.5 size-5 shrink-0" />
            Aucun e-mail de confirmation ne sera envoyé
          </p>
          <p className="mt-2 pl-8 text-sm leading-relaxed">
            Cet écran confirme définitivement votre réservation. Pensez à
            ajouter le rendez-vous à votre calendrier ci-dessous.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            downloadCalendar(
              result.appointment?.calendar ?? '',
              'rendez-vous-arbeaute.ics',
            )
          }
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-medium text-primary-foreground"
        >
          <Download className="size-4" />
          Ajouter à mon calendrier
        </button>
        {selectedService?.consentFormUrl ? (
          <div className="text-left">
            <ConsentFormNotice url={selectedService.consentFormUrl} />
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl border p-5 text-left">
          <p className="flex items-start gap-3 font-semibold">
            <Settings2 className="mt-0.5 size-5 shrink-0 text-primary" />
            Modifier ou annuler ce rendez-vous
          </p>
          <p className="mt-2 pl-8 text-sm leading-relaxed text-muted-foreground">
            Retrouvez-le maintenant dans « Mes rendez-vous ». Lors d’une
            prochaine visite, utilisez exactement l’adresse e-mail et le numéro
            de téléphone saisis lors de la réservation.
          </p>
          <a
            href="/mes-rendez-vous"
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl border border-primary px-4 text-sm font-medium text-primary"
          >
            Accéder à mes rendez-vous
          </a>
        </div>
      </section>
    )

  return (
    <section className="mx-auto max-w-3xl">
      <ol
        className="mb-8 grid grid-cols-3 gap-1.5 sm:gap-2"
        aria-label="Étapes"
      >
        {['Prestation', 'Créneau', 'Coordonnées'].map((label, index) => {
          const number = index + 1
          const canGoBack = step > number
          const active = step >= number
          return (
            <li key={label}>
              <button
                type="button"
                disabled={!canGoBack}
                onClick={() => setStep(number)}
                aria-current={step === number ? 'step' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-2xl border px-1.5 py-2.5 text-center transition sm:flex-row sm:justify-center sm:gap-2 sm:rounded-full sm:px-3',
                  active && 'border-primary bg-primary text-primary-foreground',
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
                <span className="text-[11px] leading-tight font-medium text-balance sm:text-sm">
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

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
                          <span className="font-semibold text-[#927b59]">
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
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1 text-sm font-medium"
          >
            <ChevronLeft className="size-4" /> Changer de prestation
          </button>
          <h2 className="mt-5 font-heading text-2xl font-bold">
            Choisissez votre créneau
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedService
              ? formatServiceLabel(
                  selectedService.name,
                  selectedService.categoryName,
                )
              : null}{' '}
            · {selectedService?.durationMinutes} min
          </p>
          {selectedService ? (
            <ServiceDetails
              service={selectedService}
              className="mt-4 rounded-xl border px-4 pt-0 [&>summary]:pt-1"
            />
          ) : null}

          <button
            type="button"
            onClick={findNextSlot}
            disabled={searchingNext}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 text-sm font-medium whitespace-nowrap text-primary transition hover:bg-primary/10 disabled:opacity-60 sm:w-auto"
          >
            <Zap className="size-4 shrink-0" />
            {searchingNext ? 'Recherche…' : 'Prochain créneau disponible'}
          </button>
          {nextSlotNotice ? (
            <p className="mt-2 text-sm text-muted-foreground" role="status">
              {nextSlotNotice}
            </p>
          ) : null}

          <p className="sr-only" role="status" aria-live="polite">
            {calendarAnnouncement}
          </p>
          <div className="-mx-3 mt-6 rounded-2xl border bg-muted/25 p-2 sm:mx-0 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => goToWeek(-7)}
                disabled={!canGoPreviousWeek}
                aria-label="Période précédente"
                className="grid size-11 shrink-0 place-items-center rounded-full border bg-background transition hover:border-primary disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="flex min-w-0 items-center gap-2 text-center text-sm font-semibold sm:text-base">
                <CalendarDays className="hidden size-4 shrink-0 sm:block" />
                {formatCalendarPeriod(viewStart, weekEnd)}
              </p>
              <button
                type="button"
                onClick={() => goToWeek(7)}
                disabled={!canGoNextWeek}
                aria-label="Période suivante"
                className="grid size-11 shrink-0 place-items-center rounded-full border bg-background transition hover:border-primary disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-px sm:gap-2">
              {weekDates.map(dateKey => {
                const state = weekReady
                  ? (weekAvailability[dateKey]?.state ?? 'CLOSED')
                  : null
                const StateIcon = state ? stateIcon[state] : null
                const selected = date === dateKey
                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => selectDate(dateKey)}
                    disabled={!weekReady}
                    aria-pressed={selected}
                    aria-label={`${formatCalendarDate(dateKey)}${
                      state ? ` — ${availabilityStateLabels[state]}` : ''
                    }`}
                    className={cn(
                      'flex min-h-20 min-w-0 flex-col items-center justify-center rounded-xl border bg-background px-0.5 py-2 text-center transition disabled:opacity-50',
                      selected &&
                        'border-primary bg-primary text-primary-foreground ring-2 ring-primary/20',
                      !selected &&
                        state === 'AVAILABLE' &&
                        'border-emerald-300 text-emerald-800 hover:border-primary',
                      !selected &&
                        state === 'FULL' &&
                        'border-amber-300 bg-amber-50 text-amber-900',
                      !selected &&
                        state === 'CLOSED' &&
                        'border-dashed bg-muted text-muted-foreground',
                    )}
                  >
                    <span className="text-[10px] leading-none font-semibold uppercase sm:text-xs">
                      {formatCalendarWeekday(dateKey)}
                    </span>
                    <span className="mt-1 text-lg leading-none font-bold sm:text-xl">
                      {formatCalendarDayNumber(dateKey)}
                    </span>
                    <span className="mt-1.5 flex min-w-0 items-center justify-center gap-0.5 text-[8px] leading-none font-semibold sm:text-[10px]">
                      {StateIcon ? (
                        <StateIcon className="size-3 shrink-0" />
                      ) : null}
                      {state === 'AVAILABLE'
                        ? 'Libre'
                        : state === 'FULL'
                          ? 'Complet'
                          : state === 'CLOSED'
                            ? 'Fermé'
                            : '…'}
                    </span>
                  </button>
                )
              })}
            </div>

            <ul
              className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground sm:text-xs"
              aria-label="Légende des disponibilités"
            >
              <li className="flex items-center gap-1">
                <CircleCheck className="size-3.5 text-emerald-700" />
                Disponible
              </li>
              <li className="flex items-center gap-1">
                <X className="size-3.5 text-amber-800" /> Complet
              </li>
              <li className="flex items-center gap-1">
                <Minus className="size-3.5" /> Fermé
              </li>
            </ul>
          </div>
          <div className="mt-6">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Clock className="size-4" /> Heures disponibles
            </p>
            {loadingSlots || !weekReady ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Recherche des créneaux…
              </p>
            ) : selectedDay?.state === 'AVAILABLE' ? (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.map(slot => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    onClick={() => setStartsAt(slot.startsAt)}
                    className={cn(
                      'h-11 rounded-xl border text-sm font-medium',
                      startsAt === slot.startsAt
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-background hover:border-primary',
                    )}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            ) : selectedDay?.state === 'FULL' ? (
              <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                Tous les créneaux de ce jour sont déjà pris. Essayez une autre
                date ou recherchez le prochain créneau.
              </p>
            ) : (
              <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                L’institut est fermé ce jour-là. Choisissez une date indiquée
                comme disponible.
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!startsAt}
            onClick={() => setStep(3)}
            className="mt-7 h-12 w-full rounded-xl bg-primary px-5 font-medium text-primary-foreground disabled:opacity-40"
          >
            Continuer
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <form
          onSubmit={event => {
            event.preventDefault()
            submitBooking(new FormData(event.currentTarget))
          }}
          className="rounded-3xl border bg-card p-5 sm:p-8"
        >
          <button
            type="button"
            onClick={() => setStep(2)}
            className="inline-flex items-center gap-1 text-sm font-medium"
          >
            <ChevronLeft className="size-4" /> Changer de créneau
          </button>
          <h2 className="mt-5 font-heading text-2xl font-bold">
            Vos coordonnées
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aucun e-mail de confirmation ne sera envoyé. Votre e-mail et votre
            téléphone serviront à retrouver, modifier ou annuler ce rendez-vous
            dans « Mes rendez-vous ».
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Prénom
              <input
                name="firstName"
                required
                maxLength={100}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Nom
              <input
                name="lastName"
                required
                maxLength={100}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Téléphone
              <input
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="079 123 45 67"
                className={fieldClass}
              />
            </label>
          </div>
          <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
            Commentaire facultatif
            <textarea
              name="comment"
              rows={4}
              maxLength={1000}
              className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="sr-only" aria-hidden="true">
            Site web
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <label className="mt-5 flex items-start gap-3 text-sm">
            <input
              name="consent"
              type="checkbox"
              required
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
          {selectedService?.consentFormUrl ? (
            <ConsentFormNotice url={selectedService.consentFormUrl} />
          ) : null}

          <CancellationPolicy className="mt-5" />

          {result && !result.ok ? (
            <p
              className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              {result.message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 h-12 w-full rounded-xl bg-primary px-5 font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting ? 'Confirmation…' : 'Confirmer le rendez-vous'}
          </button>
        </form>
      ) : null}
    </section>
  )
}
