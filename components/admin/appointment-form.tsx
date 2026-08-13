'use client'

import { AlertTriangle, LoaderCircle, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { AppToast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField, formControlClass } from '@/components/ui/form-field'
import {
  cancelAdminAppointment,
  saveAdminAppointment,
} from '@/lib/actions/admin-agenda'
import { formatServiceLabel } from '@/lib/reservation/service-label'

interface ServiceOption {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
  category: { name: string } | null
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

export const AppointmentForm = ({
  services,
  appointment,
}: Readonly<AppointmentFormProps>) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [outsideWarning, setOutsideWarning] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)

  const resetWarning = () => {
    setOutsideWarning(false)
    setMessage(null)
    setToastOpen(false)
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
      if (!result.ok) setToastOpen(true)
      if (result.ok) router.push(`/admin?date=${date}`)
    })
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
      onSubmit={event => {
        event.preventDefault()
        submit(new FormData(event.currentTarget))
      }}
      onChange={resetWarning}
      className="space-y-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-7"
    >
      <FormField controlId="admin-appointment-service" label="Prestation">
        <select
          id="admin-appointment-service"
          name="serviceId"
          required
          defaultValue={appointment.serviceId ?? ''}
          className={formControlClass}
        >
          <option value="" disabled>
            Choisir une prestation
          </option>
          {services.map(service => (
            <option key={service.id} value={service.id}>
              {formatServiceLabel(service.name, service.category?.name)} ·{' '}
              {service.durationMinutes} min ·{' '}
              {(service.priceCents / 100).toLocaleString('fr-CH')} CHF
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Date
          <input
            name="date"
            type="date"
            required
            defaultValue={appointment.date}
            className={formControlClass}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Heure de début
          <input
            name="time"
            type="time"
            step={900}
            required
            defaultValue={appointment.time}
            className={formControlClass}
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium">
          <span>
            Prénom{' '}
            <span className="font-normal text-muted-foreground">
              (facultatif)
            </span>
          </span>
          <input
            name="firstName"
            maxLength={100}
            defaultValue={appointment.firstName ?? ''}
            className={formControlClass}
            autoComplete="given-name"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Nom
          <input
            name="lastName"
            required
            maxLength={100}
            defaultValue={appointment.lastName ?? ''}
            className={formControlClass}
            autoComplete="family-name"
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium">
          <span>
            Email{' '}
            <span className="font-normal text-muted-foreground">
              (facultatif)
            </span>
          </span>
          <input
            name="email"
            type="email"
            maxLength={254}
            defaultValue={appointment.email ?? ''}
            className={formControlClass}
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          <span>
            Téléphone{' '}
            <span className="font-normal text-muted-foreground">
              (facultatif)
            </span>
          </span>
          <input
            name="phone"
            type="tel"
            maxLength={40}
            defaultValue={appointment.phone ?? ''}
            className={formControlClass}
            autoComplete="tel"
          />
        </label>
      </div>
      <p className="-mt-3 text-xs leading-relaxed text-muted-foreground">
        Le rendez-vous sera accessible dans « Mes rendez-vous » uniquement si
        l’email et le téléphone sont tous les deux renseignés.
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
          defaultValue={appointment.comment ?? ''}
          className={`${formControlClass} py-3`}
        />
      </FormField>

      {message && outsideWarning ? (
        <div
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{message}</span>
          </div>
          <p className="mt-2 font-medium">
            Appuyez une seconde fois pour confirmer cette exception.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {appointment.id ? (
          <ConfirmDialog
            title="Annuler ce rendez-vous ?"
            description="Le créneau sera libéré immédiatement. Cette action restera visible dans l’historique de la cliente."
            confirmLabel="Annuler le rendez-vous"
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
        <Button
          type="submit"
          disabled={pending}
          className={outsideWarning ? 'bg-amber-700 text-white' : undefined}
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
        </Button>
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
