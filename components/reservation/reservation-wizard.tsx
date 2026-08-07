'use client'

import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState, useTransition } from 'react'
import {
  type BookingResult,
  createPublicAppointment,
  getNextPublicAvailableSlot,
  getPublicAvailability,
} from '@/lib/actions/reservation'
import type { AvailableSlot } from '@/lib/reservation/availability'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import { cn } from '@/lib/utils/cn'
import { downloadCalendar } from './calendar-download'
import { CancellationPolicy } from './cancellation-policy'

interface ReservationService {
  id: string
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

const formatQuickDate = (dateKey: string): string =>
  new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${dateKey}T12:00:00Z`))

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
  const [step, setStep] = useState(1)
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState(minDate)
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [startsAt, setStartsAt] = useState('')
  const [loadingSlots, startSlotsTransition] = useTransition()
  const [submitting, startSubmitTransition] = useTransition()
  const [searchingNext, startNextTransition] = useTransition()
  const [nextSlotNotice, setNextSlotNotice] = useState<string | null>(null)
  const [result, setResult] = useState<BookingResult | null>(null)
  const [viewStart, setViewStart] = useState(minDate)
  const pendingSlotRef = useRef<string | null>(null)
  const selectedService = services.find(service => service.id === serviceId)
  const weekDates = Array.from({ length: 7 }, (_, index) =>
    addDateKeyDays(viewStart, index),
  ).filter(dateKey => dateKey <= maxDate)
  const canGoPreviousWeek = viewStart > minDate
  const canGoNextWeek = addDateKeyDays(viewStart, 7) <= maxDate

  const goToWeek = (amount: number) => {
    const next = addDateKeyDays(viewStart, amount)
    setViewStart(next < minDate ? minDate : next > maxDate ? maxDate : next)
  }

  const selectDate = (dateKey: string) => {
    setDate(dateKey)
    if (dateKey < viewStart || dateKey > addDateKeyDays(viewStart, 6))
      setViewStart(dateKey)
  }

  useEffect(() => {
    if (step !== 2 || !serviceId || !date) return
    startSlotsTransition(async () => {
      const loaded = await getPublicAvailability(serviceId, date)
      setSlots(loaded)
      const pending = pendingSlotRef.current
      pendingSlotRef.current = null
      setStartsAt(
        pending && loaded.some(slot => slot.startsAt === pending)
          ? pending
          : '',
      )
    })
  }, [date, serviceId, step])

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
      setViewStart(found.dateKey)
      if (found.dateKey === date) setStartsAt(found.slot.startsAt)
      else {
        pendingSlotRef.current = found.slot.startsAt
        setDate(found.dateKey)
      }
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
          Merci pour votre réservation
        </h2>
        <div className="mt-6 rounded-2xl bg-muted p-5 text-left">
          <p className="font-semibold">{result.appointment.serviceName}</p>
          <p className="mt-2 text-sm capitalize">
            {result.appointment.dateLabel}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.appointment.priceLabel}
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

        <a
          href="/mes-rendez-vous"
          className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
        >
          Gérer mes rendez-vous
        </a>
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
                        onClick={() => {
                          setServiceId(service.id)
                          setStep(2)
                        }}
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
            <p className="mt-2 text-sm text-muted-foreground">
              {nextSlotNotice}
            </p>
          ) : null}

          <label className="mt-6 flex flex-col gap-2 text-sm font-medium">
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4" /> Date
            </span>
            <input
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={event => selectDate(event.target.value)}
              className={fieldClass}
            />
          </label>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToWeek(-7)}
              disabled={!canGoPreviousWeek}
              aria-label="Semaine précédente"
              className="grid size-9 shrink-0 place-items-center rounded-full border disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex flex-1 gap-2 overflow-x-auto pb-2">
              {weekDates.map(dateKey => (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectDate(dateKey)}
                  aria-label={formatQuickDate(dateKey)}
                  className={cn(
                    'min-w-24 shrink-0 rounded-xl border px-3 py-2 text-sm font-medium capitalize',
                    date === dateKey
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background hover:border-primary',
                  )}
                >
                  {formatQuickDate(dateKey)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => goToWeek(7)}
              disabled={!canGoNextWeek}
              aria-label="Semaine suivante"
              className="grid size-9 shrink-0 place-items-center rounded-full border disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="mt-6">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Clock className="size-4" /> Heures disponibles
            </p>
            {loadingSlots ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Recherche des créneaux…
              </p>
            ) : slots.length > 0 ? (
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
            ) : (
              <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                Aucun créneau disponible ce jour-là. Essayez une autre date.
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
            Elles serviront aussi à retrouver ce rendez-vous.
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
