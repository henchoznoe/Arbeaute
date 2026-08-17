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
          <h2 className="text-xl font-semibold">
            Effacer les coordonnées d’une personne
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            À utiliser quand quelqu’un demande la suppression de ses données.
            Son nom, son e-mail et son téléphone disparaissent définitivement.
            Les rendez-vous restent, sans nom, pour que vos chiffres restent
            justes. <strong className="font-semibold">C’est définitif :</strong>{' '}
            on ne peut pas revenir en arrière.
          </p>
        </div>
      </div>

      <form onSubmit={handlePreview} className="mt-5 grid gap-4">
        <FormField
          controlId="anonymization-email"
          label="Adresse e-mail exacte"
          help="C’est elle qui identifie la fiche. Recopiez-la depuis un de ses rendez-vous."
        >
          <input
            id="anonymization-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            className={formControlClass}
          />
        </FormField>
        <Button type="submit" variant="outline" disabled={isPending}>
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
            <li>
              {preview.appointmentCount} rendez-vous perdront le nom et les
              coordonnées
            </li>
            <li>
              {preview.activityCount} ligne
              {preview.activityCount > 1 ? 's' : ''} d’activité perdront le nom
            </li>
            <li>
              Toute session « Mes rendez-vous » encore ouverte sera fermée
            </li>
          </ul>
          <FormField
            controlId="anonymization-confirmation"
            label="Pour confirmer, recopiez exactement cette phrase"
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
            {isPending
              ? 'Effacement en cours…'
              : 'Effacer définitivement ces coordonnées'}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
