'use client'

import { LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { cn } from '@/lib/utils/cn'

interface SubmitButtonProps {
  children: ReactNode
  className?: string
  /** Libellé affiché pendant l'envoi ; sinon seule l'icône tourne. */
  pendingLabel?: string
  disabled?: boolean
  'aria-label'?: string
}

/**
 * Bouton d'envoi qui affiche automatiquement son état de chargement.
 *
 * S'appuie sur useFormStatus, ce qui permet de garder les formulaires en
 * composants serveur tout en donnant un retour immédiat à l'utilisatrice.
 */
export const SubmitButton = ({
  children,
  className,
  pendingLabel,
  disabled = false,
  'aria-label': ariaLabel,
}: Readonly<SubmitButtonProps>) => {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-label={ariaLabel}
      aria-busy={pending}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-30',
        pending && 'cursor-progress',
        className,
      )}
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 shrink-0 animate-spin" />
          {pendingLabel ?? null}
        </>
      ) : (
        children
      )}
    </button>
  )
}
