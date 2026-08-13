'use client'

import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { Toast } from 'radix-ui'
import { cn } from '@/lib/utils/cn'

export const AppToast = ({
  open,
  onOpenChange,
  title,
  description,
  variant = 'success',
}: Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  variant?: 'success' | 'danger'
}>) => {
  const Icon = variant === 'danger' ? CircleAlert : CheckCircle2
  return (
    <Toast.Provider swipeDirection="right">
      <Toast.Root
        open={open}
        onOpenChange={onOpenChange}
        duration={6000}
        className={cn(
          'grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-2xl border bg-popover p-4 text-popover-foreground shadow-xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right motion-reduce:animate-none',
          variant === 'danger' ? 'border-destructive/30' : 'border-emerald-200',
        )}
      >
        <Icon
          className={cn(
            'mt-0.5 size-5',
            variant === 'danger' ? 'text-destructive' : 'text-emerald-700',
          )}
        />
        <div>
          <Toast.Title className="text-sm font-semibold">{title}</Toast.Title>
          {description ? (
            <Toast.Description className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </Toast.Description>
          ) : null}
        </div>
        <Toast.Close
          aria-label="Fermer la notification"
          className="grid size-11 -m-2 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </Toast.Close>
      </Toast.Root>
      <Toast.Viewport className="fixed inset-x-4 top-[calc(1rem+env(safe-area-inset-top))] z-[100] m-0 flex max-h-screen list-none flex-col gap-2 outline-none sm:left-auto sm:right-4 sm:w-96" />
    </Toast.Provider>
  )
}
