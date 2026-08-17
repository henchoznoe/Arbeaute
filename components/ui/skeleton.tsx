import { cn } from '@/lib/utils/cn'

/**
 * Bloc d'attente. Il n'annonce rien : chaque coquille porte un seul
 * `role="status"` invisible, sans quoi un lecteur d'écran énumérerait vingt
 * rectangles. L'animation est neutralisée par `prefers-reduced-motion` dans
 * `app/globals.css`.
 */
export const Skeleton = ({ className }: Readonly<{ className?: string }>) => (
  <div
    aria-hidden="true"
    className={cn('animate-pulse rounded-xl bg-muted', className)}
  />
)

/**
 * Clés stables pour les répétitions d'une coquille. Les blocs n'ont pas de
 * données à porter, et un `key` d'indice est refusé par le linter.
 */
export const skeletonKeys = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `skeleton-${index}`)
