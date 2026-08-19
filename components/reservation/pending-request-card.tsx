'use client'

import { Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { AppToast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { withdrawLateRequest } from '@/lib/actions/late-requests'
import { contact } from '@/lib/constants/contact'

interface PendingRequestCardProps {
  requestId: string
  serviceName: string
  dateLabel: string
  priceLabel: string
}

/**
 * Une demande en attente, du côté de la personne qui l'a faite.
 *
 * Elle ne ressemble pas à un rendez-vous : teinte d'attente, mention explicite
 * qu'il n'y en a pas encore, et une seule action possible — retirer. Sans cet
 * écran, la personne n'aurait aucun moyen de savoir où elle en est.
 */
export const PendingRequestCard = ({
  requestId,
  serviceName,
  dateLabel,
  priceLabel,
}: Readonly<PendingRequestCardProps>) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)

  const withdraw = () => {
    startTransition(async () => {
      setError(null)
      const result = await withdrawLateRequest(requestId)
      if (result.ok) {
        setConfirmation(result.message)
        router.refresh()
      } else setError(result.message)
    })
  }

  return (
    <article className="rounded-3xl border border-primary/25 bg-primary/5 p-5 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Clock className="size-4 shrink-0" />
        En attente de réponse
      </p>
      <h3 className="mt-3 font-heading text-xl font-bold">{serviceName}</h3>
      <p className="mt-1 text-sm">{dateLabel}</p>
      <p className="mt-1 text-sm text-price">{priceLabel}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Cette heure est trop proche pour être réservée en ligne. {contact.owner}{' '}
        vous répond par e-mail : tant qu’elle ne l’a pas fait, vous n’avez pas
        de rendez-vous.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <ConfirmDialog
          title="Retirer cette demande ?"
          description={`Votre demande pour le ${dateLabel} ne sera plus transmise. Vous pourrez toujours en faire une autre, ou appeler l’institut.`}
          confirmLabel="Oui, retirer ma demande"
          cancelLabel="Non, la garder"
          pending={pending}
          onConfirm={withdraw}
          trigger={
            <Button type="button" variant="outline" disabled={pending}>
              Retirer ma demande
            </Button>
          }
        />
        <Button asChild variant="secondary">
          <a href={`tel:${contact.phoneRaw}`}>Appeler l’institut</a>
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <AppToast
        open={Boolean(confirmation)}
        onOpenChange={open => !open && setConfirmation(null)}
        title="C’est fait"
        description={confirmation ?? undefined}
      />
    </article>
  )
}
