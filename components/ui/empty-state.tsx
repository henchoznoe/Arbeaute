import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: Readonly<{
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}>) => (
  <div
    data-slot="empty-state"
    className={cn(
      'rounded-2xl border bg-card px-5 py-8 text-center',
      className,
    )}
  >
    {icon ? (
      <span className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
    ) : null}
    <p className="font-semibold">{title}</p>
    {description ? (
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    ) : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
)
