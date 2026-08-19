'use client'

import { AlertTriangle } from 'lucide-react'
import { AlertDialog } from 'radix-ui'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export const ConfirmDialog = ({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Annuler',
  onConfirm,
  pending = false,
  confirmVariant = 'destructive',
}: Readonly<{
  trigger: ReactNode
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  pending?: boolean
  confirmVariant?: 'default' | 'destructive'
}>) => (
  <AlertDialog.Root>
    <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="fixed inset-0 z-[70] bg-ink-dark/45 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in motion-reduce:animate-none" />
      <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border bg-background p-6 shadow-2xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 motion-reduce:animate-none sm:p-7">
        <span className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </span>
        <AlertDialog.Title className="mt-4 font-heading text-2xl font-bold">
          {title}
        </AlertDialog.Title>
        <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </AlertDialog.Description>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <AlertDialog.Cancel asChild>
            <Button variant="outline" disabled={pending}>
              {cancelLabel}
            </Button>
          </AlertDialog.Cancel>
          <Button
            variant={confirmVariant}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? 'Traitement…' : confirmLabel}
          </Button>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
)
