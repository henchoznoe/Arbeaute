'use client'

import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  LoaderCircle,
  Repeat2,
  Save,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { CustomerPicker } from '@/components/admin/customer-picker'
import {
  type AdminServiceOption,
  ServicePicker,
} from '@/components/admin/service-picker'
import { AppToast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField, formControlClass } from '@/components/ui/form-field'
import {
  type AdminAppointmentSeriesFormInput,
  type AdminCustomerOption,
  cancelAdminAppointment,
  createAdminAppointmentSeries,
  previewAdminAppointmentSeries,
  saveAdminAppointment,
} from '@/lib/actions/admin-agenda'
import type { AdminAppointmentSeriesPreview } from '@/lib/admin/agenda'
import { formatCalendarShortDate } from '@/lib/reservation/calendar-view'
import { capitalizeFirst } from '@/lib/utils/format'

interface AppointmentValues {
  id?: string
  serviceId?: string
  date: string
  time: string
  firstName?: string | null
  lastName?: string
  email?: string | null
  phone?: string | null
  comment?: string | null
}

interface AppointmentFormProps {
  services: AdminServiceOption[]
  appointment: AppointmentValues
}

const formatSeriesDate = (date: string): string => formatCalendarShortDate(date)

export const AppointmentForm = ({
  services,
  appointment,
}: Readonly<AppointmentFormProps>) => {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  /**
   * Les réserves que le serveur a soulevées et qu'Arzu peut lever d'un second
   * appui : hors ouverture, superposition, ou les deux à la fois.
   */
  const [override, setOverride] = useState<{
    outsideHours: boolean
    overlap: boolean
  } | null>(null)
  const [toastOpen, setToastOpen] = useState(false)
  const [seriesEnabled, setSeriesEnabled] = useState(false)
  const [seriesPreview, setSeriesPreview] =
    useState<AdminAppointmentSeriesPreview | null>(null)
  const [acknowledgeSeriesOutsideHours, setAcknowledgeSeriesOutsideHours] =
    useState(false)
  const [firstName, setFirstName] = useState(appointment.firstName ?? '')
  const [lastName, setLastName] = useState(appointment.lastName ?? '')
  const [email, setEmail] = useState(appointment.email ?? '')
  const [phone, setPhone] = useState(appointment.phone ?? '')
  const [comment, setComment] = useState(appointment.comment ?? '')

  const resetWarning = () => {
    setOverride(null)
    setMessage(null)
    setToastOpen(false)
    setSeriesPreview(null)
    setAcknowledgeSeriesOutsideHours(false)
  }

  const getSeriesInput = (
    formData: FormData,
  ): AdminAppointmentSeriesFormInput => ({
    serviceId: String(formData.get('serviceId') ?? ''),
    date: String(formData.get('date') ?? ''),
    time: String(formData.get('time') ?? ''),
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    comment: String(formData.get('comment') ?? ''),
    occurrenceCount: Number(formData.get('occurrenceCount')),
    intervalWeeks: Number(formData.get('intervalWeeks')),
    acknowledgeOutsideHours: acknowledgeSeriesOutsideHours,
  })

  const submit = (formData: FormData) => {
    const date = String(formData.get('date') ?? '')
    startTransition(async () => {
      const result = await saveAdminAppointment({
        appointmentId: appointment.id,
        serviceId: String(formData.get('serviceId') ?? ''),
        date,
        time: String(formData.get('time') ?? ''),
        firstName: String(formData.get('firstName') ?? ''),
        lastName: String(formData.get('lastName') ?? ''),
        email: String(formData.get('email') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        comment: String(formData.get('comment') ?? ''),
        acknowledgeOutsideHours: override?.outsideHours,
        acknowledgeOverlap: override?.overlap,
      })
      setMessage(result.message)
      if (
        result.needsOutsideHoursConfirmation ||
        result.needsOverlapConfirmation
      ) {
        setOverride({
          outsideHours: Boolean(result.needsOutsideHoursConfirmation),
          overlap: Boolean(result.needsOverlapConfirmation),
        })
        return
      }
      if (!result.ok) setToastOpen(true)
      if (result.ok) router.push(`/admin?date=${date}`)
    })
  }

  const previewSeries = (formData: FormData) => {
    startTransition(async () => {
      const result = await previewAdminAppointmentSeries(
        getSeriesInput(formData),
      )
      setMessage(result.message)
      setSeriesPreview(result.preview ?? null)
      if (!result.ok) setToastOpen(true)
    })
  }

  const createSeries = () => {
    if (!formRef.current || !seriesPreview) return
    const date = String(new FormData(formRef.current).get('date') ?? '')
    startTransition(async () => {
      if (!formRef.current) return
      const result = await createAdminAppointmentSeries(
        getSeriesInput(new FormData(formRef.current)),
      )
      setMessage(result.message)
      if (result.preview) setSeriesPreview(result.preview)
      if (result.ok) router.push(`/admin?date=${date}`)
      else setToastOpen(true)
    })
  }

  const selectCustomer = (customer: AdminCustomerOption) => {
    setFirstName(customer.firstName ?? '')
    setLastName(customer.lastName)
    setEmail(customer.email)
    setPhone(customer.phone)
    resetWarning()
  }

  const cancel = () => {
    if (!appointment.id) return
    startTransition(async () => {
      const result = await cancelAdminAppointment(appointment.id as string)
      setMessage(result.message)
      if (result.ok) router.push(`/admin?date=${appointment.date}`)
      else setToastOpen(true)
    })
  }

  return (
    <form
      ref={formRef}
      method="post"
      onSubmit={event => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        if (seriesEnabled) previewSeries(formData)
        else submit(formData)
      }}
      onChange={resetWarning}
      className="space-y-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-7"
    >
      <ServicePicker
        services={services}
        initialServiceId={appointment.serviceId}
        onSelectionChange={resetWarning}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField controlId="admin-appointment-date" label="Date">
          <input
            id="admin-appointment-date"
            name="date"
            type="date"
            required
            defaultValue={appointment.date}
            className={formControlClass}
          />
        </FormField>
        <FormField controlId="admin-appointment-time" label="Heure de début">
          <input
            id="admin-appointment-time"
            name="time"
            type="time"
            step={900}
            required
            defaultValue={appointment.time}
            className={formControlClass}
          />
        </FormField>
      </div>

      {!appointment.id ? (
        <section className="rounded-2xl border bg-muted/30 p-4">
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={seriesEnabled}
              onChange={event => {
                setSeriesEnabled(event.target.checked)
                resetWarning()
              }}
              className="size-5 accent-primary"
            />
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Repeat2 className="size-4 text-primary" /> Répéter ce
                rendez-vous
              </span>
              <span className="block text-xs text-muted-foreground">
                Même soin, même heure, plusieurs fois de suite. Vous choisissez
                combien de fois et à quel rythme.
              </span>
            </span>
          </label>
          {seriesEnabled ? (
            <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
              <FormField
                controlId="admin-series-count"
                label="Combien de fois au total"
              >
                <input
                  id="admin-series-count"
                  name="occurrenceCount"
                  type="number"
                  min={2}
                  max={24}
                  defaultValue={4}
                  required
                  className={formControlClass}
                />
              </FormField>
              <FormField
                controlId="admin-series-interval"
                label="À quel rythme"
              >
                <select
                  id="admin-series-interval"
                  name="intervalWeeks"
                  defaultValue={1}
                  className={formControlClass}
                >
                  <option value={1}>1 semaine</option>
                  <option value={2}>2 semaines</option>
                  <option value={3}>3 semaines</option>
                  <option value={4}>4 semaines</option>
                  <option value={6}>6 semaines</option>
                  <option value={8}>8 semaines</option>
                  <option value={12}>12 semaines</option>
                </select>
              </FormField>
            </div>
          ) : null}
        </section>
      ) : null}

      <CustomerPicker onSelect={selectCustomer} />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          controlId="admin-appointment-first-name"
          label="Prénom"
          optional
        >
          <input
            id="admin-appointment-first-name"
            name="firstName"
            maxLength={100}
            value={firstName}
            onChange={event => setFirstName(event.target.value)}
            className={formControlClass}
            autoComplete="given-name"
          />
        </FormField>
        <FormField controlId="admin-appointment-last-name" label="Nom">
          <input
            id="admin-appointment-last-name"
            name="lastName"
            required
            maxLength={100}
            value={lastName}
            onChange={event => setLastName(event.target.value)}
            className={formControlClass}
            autoComplete="family-name"
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField controlId="admin-appointment-email" label="E-mail">
          <input
            id="admin-appointment-email"
            name="email"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={event => setEmail(event.target.value)}
            className={formControlClass}
            autoComplete="email"
          />
        </FormField>
        <FormField controlId="admin-appointment-phone" label="Téléphone">
          <input
            id="admin-appointment-phone"
            name="phone"
            type="tel"
            required
            maxLength={40}
            value={phone}
            onChange={event => setPhone(event.target.value)}
            className={formControlClass}
            autoComplete="tel"
          />
        </FormField>
      </div>
      <p className="-mt-3 text-xs leading-relaxed text-muted-foreground">
        Les deux sont nécessaires : l’e-mail sert à envoyer la confirmation et
        le rappel de la veille, et permet de retrouver le rendez-vous dans « Mes
        rendez-vous ».
      </p>

      <FormField
        controlId="admin-appointment-comment"
        label="Commentaire"
        optional
      >
        <textarea
          id="admin-appointment-comment"
          name="comment"
          rows={4}
          maxLength={1000}
          value={comment}
          onChange={event => setComment(event.target.value)}
          className={`${formControlClass} py-3`}
        />
      </FormField>

      {seriesEnabled && seriesPreview ? (
        <section
          className="rounded-2xl border border-primary/20 bg-primary/5 p-4"
          aria-labelledby="series-preview-title"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <CalendarCheck className="size-5" />
            </span>
            <div>
              <h2 id="series-preview-title" className="font-semibold">
                Aperçu de la série
              </h2>
              <p className="text-xs text-muted-foreground">{message}</p>
            </div>
          </div>
          <ol className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
            {seriesPreview.occurrences.map(occurrence => {
              const hasConflict = Boolean(occurrence.conflictTime)
              return (
                <li
                  key={`${occurrence.index}-${occurrence.date}`}
                  className={`rounded-xl border bg-background p-3 ${
                    hasConflict
                      ? 'border-destructive/40'
                      : occurrence.outsidePublicHours
                        ? 'border-warning-accent'
                        : 'border-success-line'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-sm font-semibold">
                        {occurrence.index}.{' '}
                        {capitalizeFirst(formatSeriesDate(occurrence.date))}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Soin de {occurrence.time} à {occurrence.endsAtTime},
                        institut occupé de {occurrence.occupiedStartsAtTime} à{' '}
                        {occurrence.occupiedEndsAtTime}
                      </span>
                    </span>
                    {hasConflict ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">
                        <XCircle className="size-3" /> Conflit
                      </span>
                    ) : occurrence.outsidePublicHours ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-soft px-2 py-1 text-[11px] font-semibold text-warning-strong">
                        <AlertTriangle className="size-3" /> Hors ouverture
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-subtle px-2 py-1 text-[11px] font-semibold text-success-strong">
                        <CheckCircle2 className="size-3" /> Libre
                      </span>
                    )}
                  </div>
                  {hasConflict ? (
                    <p className="mt-2 text-xs font-medium text-destructive">
                      Se superpose au rendez-vous de {occurrence.conflictTime},
                      temps d’installation et de rangement compris. Changez
                      l’heure ou la date de départ.
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ol>
          {seriesPreview.outsidePublicHoursCount > 0 &&
          seriesPreview.conflictCount === 0 ? (
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-warning-accent bg-warning-subtle p-3 text-sm text-warning-strong">
              <input
                type="checkbox"
                checked={acknowledgeSeriesOutsideHours}
                onChange={event => {
                  event.stopPropagation()
                  setAcknowledgeSeriesOutsideHours(event.target.checked)
                }}
                className="mt-0.5 size-5 shrink-0 accent-warning"
              />
              Je confirme : {seriesPreview.outsidePublicHoursCount} de ces
              rendez-vous{' '}
              {seriesPreview.outsidePublicHoursCount > 1 ? 'tombent' : 'tombe'}{' '}
              en dehors de vos heures d’ouverture.
            </label>
          ) : null}
        </section>
      ) : null}

      {message && override ? (
        <div
          role="status"
          className="rounded-xl border border-warning-accent bg-warning-subtle p-4 text-sm text-warning-strong"
        >
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{message}</span>
          </div>
          {override.outsideHours ? (
            <p className="mt-2">
              Vous pouvez aussi ouvrir ce jour dans « Jours particuliers ».
            </p>
          ) : null}
          <p className="mt-2 font-medium">
            Appuyez une seconde fois pour confirmer cette exception.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {appointment.id ? (
          <ConfirmDialog
            title="Annuler ce rendez-vous ?"
            description="L’heure redevient libre tout de suite et le rendez-vous s’affichera comme annulé sur le site. Vous pourrez le rétablir ensuite si l’heure est encore disponible."
            confirmLabel="Oui, annuler ce rendez-vous"
            cancelLabel="Non, le garder"
            onConfirm={cancel}
            pending={pending}
            trigger={
              <Button type="button" variant="destructive" disabled={pending}>
                <Trash2 className="size-4" />
                Annuler le rendez-vous
              </Button>
            }
          />
        ) : (
          <span />
        )}
        {seriesEnabled ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {seriesPreview ? (
              <Button type="submit" variant="outline" disabled={pending}>
                <Repeat2 className="size-4" /> Recalculer l’aperçu
              </Button>
            ) : null}
            <Button
              type={seriesPreview ? 'button' : 'submit'}
              disabled={
                pending ||
                Boolean(seriesPreview?.conflictCount) ||
                Boolean(
                  seriesPreview?.outsidePublicHoursCount &&
                    !acknowledgeSeriesOutsideHours,
                )
              }
              onClick={seriesPreview ? createSeries : undefined}
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : seriesPreview ? (
                <Save className="size-4" />
              ) : (
                <CalendarCheck className="size-4" />
              )}
              {seriesPreview
                ? `Créer ${seriesPreview.occurrences.length} rendez-vous`
                : 'Vérifier toutes les dates'}
            </Button>
          </div>
        ) : (
          <Button
            type="submit"
            disabled={pending}
            className={override ? 'bg-warning text-white' : undefined}
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : override ? (
              <AlertTriangle className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {override
              ? override.overlap && !override.outsideHours
                ? 'Confirmer la superposition'
                : 'Confirmer malgré l’horaire'
              : appointment.id
                ? 'Enregistrer les modifications'
                : 'Créer le rendez-vous'}
          </Button>
        )}
      </div>
      <AppToast
        open={toastOpen}
        onOpenChange={setToastOpen}
        title="Action impossible"
        description={message ?? undefined}
        variant="danger"
      />
    </form>
  )
}
