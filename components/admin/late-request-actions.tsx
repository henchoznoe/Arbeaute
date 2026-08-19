'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { AppToast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField, formControlClass } from '@/components/ui/form-field'
import {
  acceptLateRequest,
  declineLateRequest,
} from '@/lib/actions/admin-late-requests'

interface LateRequestActionsProps {
  requestId: string
  momentLabel: string
  customerLabel: string
}

/**
 * Les deux réponses possibles à une demande.
 *
 * Les verbes ne se ressemblent pas — « Accepter cette demande » face à
 * « Refuser cette demande » —, et renoncer se dit en toutes lettres plutôt que
 * par un « Annuler » qui, ici, désignerait aussi bien l'un que l'autre.
 */
export const LateRequestActions = ({
  requestId,
  momentLabel,
  customerLabel,
}: Readonly<LateRequestActionsProps>) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')

  const decide = (decision: 'accept' | 'decline') => {
    startTransition(async () => {
      setError(null)
      const result =
        decision === 'accept'
          ? await acceptLateRequest({ requestId })
          : await declineLateRequest({ requestId, declineReason })
      if (result.ok) {
        setConfirmation(result.message)
        setDeclineReason('')
        router.refresh()
      } else setError(result.message)
    })
  }

  return (
    <>
      <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
        <ConfirmDialog
          title="Accepter cette demande ?"
          description={`Le rendez-vous du ${momentLabel} est créé pour ${customerLabel}, et la confirmation part par e-mail.`}
          confirmLabel="Oui, accepter cette demande"
          cancelLabel="Ne rien décider maintenant"
          confirmVariant="default"
          pending={pending}
          onConfirm={() => decide('accept')}
          trigger={
            <Button type="button" disabled={pending}>
              Accepter cette demande
            </Button>
          }
        />
        <ConfirmDialog
          title="Refuser cette demande ?"
          description={`Aucun rendez-vous ne sera créé le ${momentLabel}, et ${customerLabel} reçoit un message avec les heures encore libres.`}
          confirmLabel="Oui, refuser cette demande"
          cancelLabel="Ne rien décider maintenant"
          pending={pending}
          onConfirm={() => decide('decline')}
          trigger={
            <Button type="button" variant="outline" disabled={pending}>
              Refuser cette demande
            </Button>
          }
        />
      </div>

      {/* Facultatif, et repris tel quel dans le message : une phrase d'Arzu
          vaut mieux qu'un refus sec, mais l'exiger retarderait la réponse. */}
      <FormField
        controlId="late-request-decline-reason"
        label="Un mot à joindre au refus"
        optional
        className="mt-3"
      >
        <textarea
          id="late-request-decline-reason"
          value={declineReason}
          onChange={event => setDeclineReason(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Je suis déjà prise à cette heure-là, mais jeudi matin je suis libre."
          className={`${formControlClass} py-2`}
        />
      </FormField>

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
    </>
  )
}
