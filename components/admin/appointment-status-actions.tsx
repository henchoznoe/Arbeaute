'use client'

import { CheckCheck, LoaderCircle, RotateCcw, UserX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { changeAdminAppointmentStatus } from '@/lib/actions/admin-appointment-status'
import type { AdminAppointmentStatusTarget } from '@/lib/admin/appointment-status'
import type { AppointmentStatus } from '@/prisma/generated/prisma/enums'

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
  const isFuture = new Date(startsAt).getTime() > Date.now()

  const changeStatus = (targetStatus: AdminAppointmentStatusTarget) => {
    startTransition(async () => {
      setMessage(null)
      const result = await changeAdminAppointmentStatus({
        appointmentId,
        targetStatus,
      })
      if (result.ok) router.refresh()
      else setMessage(result.message)
    })
  }

  const buttonClassName = compact ? 'w-full px-2 text-xs' : undefined

  return (
    <>
      <div
        className={`${compact ? `grid gap-2 ${status === 'CONFIRMED' ? 'grid-cols-2' : ''}` : 'grid gap-3 sm:grid-cols-2'} ${className ?? ''}`}
      >
        {status === 'CONFIRMED' ? (
          <>
            <ConfirmDialog
              title={
                isFuture
                  ? 'Marquer ce rendez-vous futur comme terminé ?'
                  : 'Marquer ce rendez-vous comme terminé ?'
              }
              description={
                isFuture
                  ? 'La date du rendez-vous n’est pas encore passée. Il quittera les créneaux confirmés et la cliente ne pourra plus le déplacer.'
                  : 'La visite comptera comme réalisée et la cliente ne pourra plus déplacer ce rendez-vous.'
              }
              confirmLabel="Marquer comme terminé"
              confirmVariant="default"
              onConfirm={() => changeStatus('COMPLETED')}
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
                    <CheckCheck className="size-4" />
                  )}
                  Terminé
                </Button>
              }
            />
            <ConfirmDialog
              title={
                isFuture
                  ? 'Marquer ce rendez-vous futur comme absence ?'
                  : 'Marquer cette cliente comme absente ?'
              }
              description={
                isFuture
                  ? 'La date du rendez-vous n’est pas encore passée. Le créneau sera libéré et la cliente ne pourra plus déplacer ce rendez-vous.'
                  : 'Le rendez-vous sera conservé comme absence et ne comptera pas comme une visite réalisée.'
              }
              confirmLabel="Marquer comme absence"
              onConfirm={() => changeStatus('NO_SHOW')}
              pending={pending}
              trigger={
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  className={buttonClassName}
                >
                  <UserX className="size-4" /> Absence
                </Button>
              }
            />
          </>
        ) : (
          <ConfirmDialog
            title="Rétablir ce rendez-vous ?"
            description="Le créneau sera contrôlé à nouveau, préparation et rangement inclus. Le rétablissement sera refusé si un autre rendez-vous confirmé le chevauche."
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
    </>
  )
}
