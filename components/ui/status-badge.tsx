import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils/cn'

const statusBadgeVariants = cva(
  'inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-muted text-muted-foreground',
        info: 'border-primary/25 bg-primary/10 text-primary',
        success:
          'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
        warning:
          'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
        danger: 'border-destructive/25 bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export const StatusBadge = ({
  variant,
  className,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof statusBadgeVariants>) => (
  <span
    data-slot="status-badge"
    className={cn(statusBadgeVariants({ variant }), className)}
    {...props}
  />
)
