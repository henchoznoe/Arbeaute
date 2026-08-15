'use client'

import { ShieldAlert } from 'lucide-react'
import { type FormEvent, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { FormField, formControlClass } from '@/components/ui/form-field'
import {
  confirmCustomerAnonymization,
  previewCustomerAnonymization,
} from '@/lib/actions/admin-data'
import type { AnonymizationPreview } from '@/lib/admin/data-management'

export const CustomerAnonymization = () => {
  const [preview, setPreview] = useState<AnonymizationPreview | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handlePreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPreview(null)
    setConfirmation('')
    startTransition(async () => {
      const result = await previewCustomerAnonymization({
        email: form.get('email'),
        phone: form.get('phone'),
      })
      setIsError(!result.ok)
      setMessage(result.message)
      setPreview(result.preview ?? null)
    })
  }

  const handleConfirmation = () => {
    if (!preview) return
    startTransition(async () => {
      const result = await confirmCustomerAnonymization({
        customerId: preview.customerId,
        confirmation,
      })
      setIsError(!result.ok)
      setMessage(result.message)
      if (result.ok) {
        setPreview(null)
        setConfirmation('')
      }
    })
  }

  return (
    <section className="rounded-3xl border border-destructive/20 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Anonymiser une cliente</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Cette action est irréversible. Elle conserve uniquement les données
            nécessaires aux rendez-vous et statistiques comptables.
          </p>
        </div>
      </div>

      <form onSubmit={handlePreview} className="mt-5 grid gap-4 sm:grid-cols-2">
        <FormField controlId="anonymization-email" label="Email exact">
          <input
            id="anonymization-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            className={formControlClass}
          />
        </FormField>
        <FormField controlId="anonymization-phone" label="Téléphone exact">
          <input
            id="anonymization-phone"
            name="phone"
            type="tel"
            required
            autoComplete="off"
            className={formControlClass}
          />
        </FormField>
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          className="sm:col-span-2"
        >
          {isPending ? 'Recherche…' : 'Afficher l’aperçu'}
        </Button>
      </form>

      {message ? (
        <p
          className={`mt-4 rounded-xl p-3 text-sm font-medium ${
            isError
              ? 'bg-destructive/10 text-destructive'
              : 'bg-success-subtle text-success-strong'
          }`}
          role={isError ? 'alert' : 'status'}
        >
          {message}
        </p>
      ) : null}

      {preview ? (
        <div className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="font-semibold">{preview.displayName}</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>{preview.appointmentCount} rendez-vous seront nettoyés</li>
            <li>
              {preview.activityCount} activités clientes seront anonymisées
            </li>
            <li>Les sessions clientes actives seront invalidées</li>
          </ul>
          <FormField
            controlId="anonymization-confirmation"
            label="Recopiez exactement la phrase suivante"
            help={
              <code className="select-all font-semibold text-foreground">
                {preview.confirmation}
              </code>
            }
            className="mt-4"
          >
            <input
              id="anonymization-confirmation"
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={formControlClass}
            />
          </FormField>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || confirmation !== preview.confirmation}
            onClick={handleConfirmation}
            className="mt-4 w-full"
          >
            {isPending ? 'Anonymisation…' : 'Anonymiser définitivement'}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
