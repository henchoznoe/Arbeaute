'use client'

import { LoaderCircle, RotateCcw, UserX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { AppToast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { changeAdminAppointmentStatus } from '@/lib/actions/admin-appointment-status'
import type { AdminAppointmentStatusTarget } from '@/lib/admin/appointment-status'
import type { AppointmentStatus } from '@/prisma/generated/prisma/enums'

const statusConfirmations: Record<AdminAppointmentStatusTarget, string> = {
  NO_SHOW: 'Le rendez-vous est noté comme absence, le créneau est libéré.',
  CONFIRMED: 'Le rendez-vous est rétabli.',
}

interface AppointmentStatusActionsProps {
  appointmentId: string
  status: AppointmentStatus
  startsAt: Date
  className?: string
  compact?: boolean
}

export const AppointmentStatusActions = ({
  appointmentId,
  status,
  startsAt,
  className,
  compact = false,
}: Readonly<AppointmentStatusActionsProps>) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const isFuture = new Date(startsAt).getTime() > Date.now()

  const changeStatus = (targetStatus: AdminAppointmentStatusTarget) => {
    startTransition(async () => {
      setMessage(null)
      const result = await changeAdminAppointmentStatus({
        appointmentId,
        targetStatus,
      })
      if (result.ok) {
        // Sans ce retour, la page se rafraîchit sans rien annoncer : Arzu ne
        // sait pas si son appui a été pris en compte ou si l'écran a bougé.
        setConfirmation(statusConfirmations[targetStatus])
        router.refresh()
      } else setMessage(result.message)
    })
  }

  /**
   * Dans les listes, l'absence se fait discrète.
   *
   * Une absence survient une à deux fois par mois ; le bouton, lui, s'affichait
   * sur *chaque* rendez-vous, rouge et sur toute la largeur. Six rendez-vous
   * dans la journée, c'étaient six boutons d'alerte pour un geste rare — la
   * place d'une action fréquente donnée à une action qui ne l'est pas.
   *
   * Le détail d'un rendez-vous garde la version pleine : c'est l'écran où l'on
   * vient exprès pour noter ce qui s'est passé, et la place n'y manque pas.
   */
  const buttonClassName = compact
    ? 'h-auto min-w-0 justify-start whitespace-normal px-2 py-1 text-xs'
    : undefined

  return (
    <>
      <div
        className={`${compact ? 'flex flex-wrap gap-2' : 'grid gap-3 sm:flex sm:flex-wrap'} ${className ?? ''}`}
      >
        {status === 'CONFIRMED' ? (
          <ConfirmDialog
            key={`no-show-${status}`}
            title={
              isFuture
                ? 'Noter une absence sur ce rendez-vous à venir ?'
                : 'Noter une absence sur ce rendez-vous ?'
            }
            description={
              isFuture
                ? 'La date du rendez-vous n’est pas encore passée. Le créneau sera libéré et le rendez-vous ne pourra plus être déplacé depuis le site.'
                : 'Le rendez-vous sera conservé comme absence et ne comptera pas comme une visite réalisée.'
            }
            confirmLabel="Noter l’absence"
            onConfirm={() => changeStatus('NO_SHOW')}
            pending={pending}
            trigger={
              <Button
                type="button"
                variant={compact ? 'ghost' : 'destructive'}
                disabled={pending}
                className={
                  compact
                    ? `${buttonClassName} text-muted-foreground hover:text-destructive`
                    : buttonClassName
                }
              >
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <UserX className="size-4" />
                )}
                Absence
              </Button>
            }
          />
        ) : (
          <ConfirmDialog
            key={`restore-${status}`}
            title="Rétablir ce rendez-vous ?"
            description="L’heure sera contrôlée à nouveau, installation et rangement compris. Le rétablissement sera refusé si un autre rendez-vous confirmé s’y superpose."
            confirmLabel="Rétablir le rendez-vous"
            confirmVariant="default"
            onConfirm={() => changeStatus('CONFIRMED')}
            pending={pending}
            trigger={
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className={buttonClassName}
              >
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
                Rétablir
              </Button>
            }
          />
        )}
      </div>
      {message ? (
        <p
          role="alert"
          className="mt-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs leading-relaxed text-destructive"
        >
          {message}
        </p>
      ) : null}
      <AppToast
        open={confirmation !== null}
        onOpenChange={open => {
          if (!open) setConfirmation(null)
        }}
        title="C’est enregistré"
        description={confirmation ?? undefined}
      />
    </>
  )
}
