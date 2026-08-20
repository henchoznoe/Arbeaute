'use client'

import {
  CalendarPlus2,
  Check,
  Clipboard,
  LoaderCircle,
  Phone,
  Save,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState, useTransition } from 'react'
import { AppToast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/button'
import { FormField, formControlClass } from '@/components/ui/form-field'
import { saveAdminCustomerProfile } from '@/lib/actions/admin-customers'
import type { AdminCustomer } from '@/lib/admin/customer-profile'

export const CustomerQuickActions = ({
  customerId,
  phone,
}: Readonly<{ customerId: string; phone: string }>) => {
  const [copied, setCopied] = useState(false)

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      <Button asChild className="min-w-0 px-2 text-xs min-[390px]:text-sm">
        <a href={`tel:${phone}`}>
          <Phone className="size-4" /> Appeler
        </a>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-w-0 px-2 text-xs min-[390px]:text-sm"
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
        {copied ? 'Copié' : 'Copier'}
      </Button>
      <Button
        asChild
        variant="outline"
        className="min-w-0 px-2 text-xs min-[390px]:text-sm"
      >
        <Link href={`/admin/appointments/new?customerId=${customerId}`}>
          <CalendarPlus2 className="size-4" /> Ajouter
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
      if (result.ok) router.refresh()
    })
  }

  return (
    <form
      method="post"
      onSubmit={submit}
      className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-xl font-semibold">Coordonnées et suivi</h2>
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

      <Button
        type="submit"
        disabled={pending}
        className="mt-5 w-full sm:w-auto"
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Enregistrer le client
      </Button>
      <AppToast
        open={toastOpen}
        onOpenChange={setToastOpen}
        title={isError ? 'Enregistrement impossible' : 'Client enregistré'}
        description={message ?? undefined}
        variant={isError ? 'danger' : 'success'}
      />
    </form>
  )
}
