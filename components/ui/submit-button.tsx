'use client'

import { LoaderCircle } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface SubmitButtonProps {
  children: ReactNode
  className?: string
  /** Libellé affiché pendant l'envoi ; sinon seule l'icône tourne. */
  pendingLabel?: string
  disabled?: boolean
  variant?: ComponentProps<typeof Button>['variant']
  size?: ComponentProps<typeof Button>['size']
  'aria-label'?: string
}

/**
 * Bouton d'envoi qui affiche automatiquement son état de chargement.
 *
 * S'appuie sur useFormStatus, ce qui permet de garder les formulaires en
 * composants serveur tout en donnant un retour immédiat à l'utilisatrice.
 * Le rendu passe par `Button` : un envoi a exactement la même apparence
 * qu'une action ordinaire de même variante.
 */
export const SubmitButton = ({
  children,
  className,
  pendingLabel,
  disabled = false,
  variant,
  size,
  'aria-label': ariaLabel,
}: Readonly<SubmitButtonProps>) => {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={disabled || pending}
      aria-label={ariaLabel}
      aria-busy={pending}
      className={cn(pending && 'cursor-progress', className)}
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 shrink-0 animate-spin" />
          {pendingLabel ?? null}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
