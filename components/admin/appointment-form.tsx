'use client'

import { AlertTriangle, LoaderCircle, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  cancelAdminAppointment,
  saveAdminAppointment,
} from '@/lib/actions/admin-agenda'

interface ServiceOption {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
}

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
  services: ServiceOption[]
  appointment: AppointmentValues
}

const fieldClass =
  'h-11 w-full rounded-xl border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring sm:text-sm'

export const AppointmentForm = ({
  services,
  appointment,
}: Readonly<AppointmentFormProps>) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [outsideWarning, setOutsideWarning] = useState(false)

  const resetWarning = () => {
    setOutsideWarning(false)
    setMessage(null)
  }

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
        acknowledgeOutsideHours: outsideWarning,
      })
      setMessage(result.message)
      if (result.needsOutsideHoursConfirmation) {
        setOutsideWarning(true)
        return
      }
      if (result.ok) router.push(`/admin?date=${date}`)
    })
  }

  const cancel = () => {
    if (!appointment.id || !window.confirm('Annuler ce rendez-vous ?')) return
    startTransition(async () => {
      const result = await cancelAdminAppointment(appointment.id as string)
      setMessage(result.message)
      if (result.ok) router.push(`/admin?date=${appointment.date}`)
    })
  }

  return (
    <form
      onSubmit={event => {
        event.preventDefault()
        submit(new FormData(event.currentTarget))
      }}
      onChange={resetWarning}
      className="space-y-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-7"
    >
      <label className="block space-y-2 text-sm font-medium">
        Prestation
        <select
          name="serviceId"
          required
          defaultValue={appointment.serviceId ?? ''}
          className={fieldClass}
        >
          <option value="" disabled>
            Choisir une prestation
          </option>
          {services.map(service => (
            <option key={service.id} value={service.id}>
              {service.name} · {service.durationMinutes} min ·{' '}
              {(service.priceCents / 100).toLocaleString('fr-CH')} CHF
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          Date
          <input
            name="date"
            type="date"
            required
            defaultValue={appointment.date}
            className={fieldClass}
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Heure de début
          <input
            name="time"
            type="time"
            step={900}
            required
            defaultValue={appointment.time}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          Prénom{' '}
          <span className="font-normal text-muted-foreground">
            (facultatif)
          </span>
          <input
            name="firstName"
            maxLength={100}
            defaultValue={appointment.firstName ?? ''}
            className={fieldClass}
            autoComplete="given-name"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Nom
          <input
            name="lastName"
            required
            maxLength={100}
            defaultValue={appointment.lastName ?? ''}
            className={fieldClass}
            autoComplete="family-name"
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          Email{' '}
          <span className="font-normal text-muted-foreground">
            (facultatif)
          </span>
          <input
            name="email"
            type="email"
            maxLength={254}
            defaultValue={appointment.email ?? ''}
            className={fieldClass}
            autoComplete="email"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Téléphone{' '}
          <span className="font-normal text-muted-foreground">
            (facultatif)
          </span>
          <input
            name="phone"
            type="tel"
            maxLength={40}
            defaultValue={appointment.phone ?? ''}
            className={fieldClass}
            autoComplete="tel"
          />
        </label>
      </div>
      <p className="-mt-3 text-xs leading-relaxed text-muted-foreground">
        Le rendez-vous sera accessible dans « Mes rendez-vous » uniquement si
        l’email et le téléphone sont tous les deux renseignés.
      </p>

      <label className="block space-y-2 text-sm font-medium">
        Commentaire{' '}
        <span className="font-normal text-muted-foreground">(facultatif)</span>
        <textarea
          name="comment"
          rows={4}
          maxLength={1000}
          defaultValue={appointment.comment ?? ''}
          className="w-full rounded-xl border bg-background px-3 py-3 text-base outline-none focus:ring-2 focus:ring-ring sm:text-sm"
        />
      </label>

      {message ? (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm ${outsideWarning ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-rose-200 bg-rose-50 text-rose-900'}`}
        >
          <div className="flex gap-2">
            {outsideWarning ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            ) : null}
            <span>{message}</span>
          </div>
          {outsideWarning ? (
            <p className="mt-2 font-medium">
              Appuyez une seconde fois pour confirmer cette exception.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {appointment.id ? (
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 text-sm font-medium text-destructive"
          >
            <Trash2 className="size-4" />
            Annuler le rendez-vous
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium ${outsideWarning ? 'bg-amber-600 text-white' : 'bg-primary text-primary-foreground'}`}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : outsideWarning ? (
            <AlertTriangle className="size-4" />
          ) : (
            <Save className="size-4" />
          )}
          {outsideWarning
            ? 'Confirmer hors horaires'
            : appointment.id
              ? 'Enregistrer les modifications'
              : 'Créer le rendez-vous'}
        </button>
      </div>
    </form>
  )
}
