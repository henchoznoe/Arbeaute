'use client'

import {
  CalendarPlus2,
  Check,
  Clipboard,
  LoaderCircle,
  Pencil,
  Phone,
  Save,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState, useTransition } from 'react'
import { AppToast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField, formControlClass } from '@/components/ui/form-field'
import { saveAdminCustomerProfile } from '@/lib/actions/admin-customers'
import type { AdminCustomer } from '@/lib/admin/customer-profile'

export const CustomerQuickActions = ({
  customerId,
  phone,
}: Readonly<{ customerId: string; phone: string }>) => {
  const [copied, setCopied] = useState(false)

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Button asChild className="min-w-0 px-2">
        <a href={`tel:${phone}`}>
          <Phone className="size-4" /> Appeler
        </a>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-w-0 px-2"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(phone)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1800)
          } catch {
            setCopied(false)
          }
        }}
      >
        {copied ? (
          <Check className="size-4" />
        ) : (
          <Clipboard className="size-4" />
        )}
        {copied ? 'Numéro copié' : 'Copier le numéro'}
      </Button>
      <Button asChild variant="outline" className="col-span-2 min-w-0 px-2">
        <Link href={`/admin/appointments/new?customerId=${customerId}`}>
          <CalendarPlus2 className="size-4" /> Ajouter un rendez-vous
        </Link>
      </Button>
    </div>
  )
}

export const CustomerProfileForm = ({
  customer,
}: Readonly<{ customer: AdminCustomer }>) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [toastOpen, setToastOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!dirty) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [dirty])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await saveAdminCustomerProfile({
        customerId: customer.id,
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? ''),
        internalNote: String(form.get('internalNote') ?? ''),
        preferences: String(form.get('preferences') ?? ''),
      })
      setMessage(result.message)
      setIsError(!result.ok)
      setToastOpen(true)
      if (result.ok) {
        setDirty(false)
        router.refresh()
      }
    })
  }

  if (!editing)
    return (
      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Coordonnées</h2>
            <p className="mt-2 break-all text-sm">{customer.email}</p>
            <p className="mt-1 text-sm">{customer.phone}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" /> Modifier le client
          </Button>
        </div>

        {customer.preferences ? (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Préférences</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {customer.preferences}
            </p>
          </div>
        ) : null}
        {customer.internalNote ? (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Note interne</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Visible uniquement dans l’administration.
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {customer.internalNote}
            </p>
          </div>
        ) : null}
      </section>
    )

  return (
    <form
      method="post"
      onSubmit={submit}
      onChange={() => setDirty(true)}
      className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-xl font-semibold">Modifier le client</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <FormField controlId="customer-first-name" label="Prénom" optional>
          <input
            id="customer-first-name"
            name="firstName"
            defaultValue={customer.firstName ?? ''}
            maxLength={100}
            autoComplete="given-name"
            className={formControlClass}
          />
        </FormField>
        <FormField controlId="customer-last-name" label="Nom">
          <input
            id="customer-last-name"
            name="lastName"
            defaultValue={customer.lastName}
            required
            maxLength={100}
            autoComplete="family-name"
            className={formControlClass}
          />
        </FormField>
        <FormField controlId="customer-email" label="E-mail">
          <input
            id="customer-email"
            name="email"
            type="email"
            defaultValue={customer.email}
            required
            maxLength={254}
            autoComplete="email"
            className={formControlClass}
          />
        </FormField>
        <FormField controlId="customer-phone" label="Téléphone">
          <input
            id="customer-phone"
            name="phone"
            type="tel"
            defaultValue={customer.phone}
            required
            maxLength={40}
            autoComplete="tel"
            className={formControlClass}
          />
        </FormField>
      </div>

      <FormField
        controlId="customer-preferences"
        label="Préférences"
        optional
        help="Exemples : créneau préféré, confort ou habitudes de rendez-vous."
        className="mt-5"
      >
        <textarea
          id="customer-preferences"
          name="preferences"
          rows={3}
          maxLength={500}
          defaultValue={customer.preferences ?? ''}
          className={`${formControlClass} py-3`}
        />
      </FormField>
      <FormField
        controlId="customer-internal-note"
        label="Note interne"
        optional
        help="Visible uniquement dans l’administration, jamais dans l’espace personnel."
        className="mt-5"
      >
        <textarea
          id="customer-internal-note"
          name="internalNote"
          rows={5}
          maxLength={2000}
          defaultValue={customer.internalNote ?? ''}
          className={`${formControlClass} py-3`}
        />
      </FormField>

      {/* Ce n'est plus une question : une adresse ou un numéro corrigés servent
          à joindre quelqu'un, et les e-mails de déplacement partent à l'adresse
          portée par le rendez-vous. La phrase reste pour que le comportement se
          lise, sans demander de le décider. */}
      <p className="mt-5 rounded-2xl border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        Les rendez-vous à venir suivront ces coordonnées : c’est à eux que sont
        envoyés les messages de déplacement et d’annulation, et c’est ce numéro
        que composera le bouton d’appel de l’agenda. Les rendez-vous passés,
        annulés ou notés absents gardent les coordonnées d’alors.
      </p>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {dirty ? (
          <ConfirmDialog
            title="Abandonner les modifications ?"
            description="Les informations saisies depuis l’ouverture du formulaire seront perdues."
            confirmLabel="Oui, abandonner"
            cancelLabel="Continuer à modifier"
            onConfirm={() => {
              setDirty(false)
              setEditing(false)
            }}
            trigger={
              <Button type="button" variant="outline" disabled={pending}>
                <X className="size-4" /> Fermer
              </Button>
            }
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setEditing(false)}
          >
            <X className="size-4" /> Fermer
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Enregistrer le client
        </Button>
      </div>
      <AppToast
        open={toastOpen}
        onOpenChange={open => {
          setToastOpen(open)
          if (!open && !isError) setEditing(false)
        }}
        title={isError ? 'Enregistrement impossible' : 'Client enregistré'}
        description={message ?? undefined}
        variant={isError ? 'danger' : 'success'}
      />
    </form>
  )
}
