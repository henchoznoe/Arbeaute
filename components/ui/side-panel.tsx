'use client'

import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Le panneau qui s'ouvre sur le bord droit.
 *
 * Le calendrier des jours particuliers l'avait inventé pour lui seul ; c'est
 * pourtant la bonne forme dès qu'un formulaire n'est pas le sujet de la page —
 * il laisse la liste en place derrière lui au lieu de la pousser vers le bas.
 * Sur téléphone il remonte du bas, où le pouce l'atteint.
 */
interface SidePanelProps {
  title: string
  children: ReactNode
  /** Élément cliquable qui ouvre le panneau, quand il n'est pas piloté. */
  trigger?: ReactNode
  eyebrow?: string
  description?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const SidePanel = ({
  title,
  children,
  trigger,
  eyebrow,
  description,
  open,
  onOpenChange,
}: Readonly<SidePanelProps>) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in motion-reduce:animate-none" />
      <Dialog.Content className="fixed inset-x-0 bottom-0 z-[80] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-3xl border bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom motion-reduce:animate-none sm:inset-y-4 sm:left-auto sm:right-4 sm:w-[30rem] sm:rounded-3xl sm:p-7 sm:data-[state=closed]:slide-out-to-right sm:data-[state=open]:slide-in-from-right">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                {eyebrow}
              </p>
            ) : null}
            <Dialog.Title className="mt-1 font-heading text-2xl font-bold">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </Dialog.Description>
            ) : null}
          </div>
          <Dialog.Close asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Fermer le panneau"
            >
              <X className="size-5" />
            </Button>
          </Dialog.Close>
        </div>

        <div className="mt-5">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
)
