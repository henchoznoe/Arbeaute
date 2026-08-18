import type { LucideIcon } from 'lucide-react'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

/**
 * La coquille commune de toutes les pages d'administration.
 *
 * Chaque écran choisissait sa largeur — de `max-w-3xl` pour l'activité à
 * `max-w-7xl` pour l'agenda —, si bien que passer d'une page à l'autre faisait
 * bouger le titre et les marges. La largeur est désormais décidée ici, une
 * seule fois, et les squelettes de chargement lisent la même constante : la
 * page ne saute plus quand le contenu arrive.
 */
export const ADMIN_PAGE_WIDTH = 'max-w-7xl'

export const AdminPage = ({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) => (
  <main
    className={cn(
      'mx-auto min-h-screen w-full min-w-0 px-4 py-5 sm:px-8 sm:py-8',
      ADMIN_PAGE_WIDTH,
      className,
    )}
  >
    {children}
  </main>
)

interface AdminPageHeaderProps {
  title: string
  /** Le fil d'Ariane : d'où l'on vient, jamais le bouton « précédent ». */
  backHref?: string
  backLabel?: string
  eyebrow?: string
  description?: ReactNode
  icon?: LucideIcon
  /** Boutons alignés à droite du titre sur grand écran. */
  actions?: ReactNode
  /** Pastille ou statut posé à côté du titre. */
  aside?: ReactNode
}

export const AdminPageHeader = ({
  title,
  backHref,
  backLabel,
  eyebrow,
  description,
  icon: Icon,
  actions,
  aside,
}: Readonly<AdminPageHeaderProps>) => (
  <header className="border-b pb-5">
    {backHref && backLabel ? (
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 mb-1 text-muted-foreground"
      >
        <Link href={backHref}>
          <ChevronLeft className="size-4" /> {backLabel}
        </Link>
      </Button>
    ) : null}

    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-sm font-medium text-brand">{eyebrow}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="break-words font-heading text-title font-bold">
              {title}
            </h1>
            {aside}
          </div>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  </header>
)

/**
 * La colonne d'explication des pages en deux volets : le mode d'emploi et les
 * compteurs restent visibles à gauche pendant qu'on fait défiler la liste.
 */
export const AdminPageAside = ({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) => (
  <aside
    className={cn(
      'min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start',
      className,
    )}
  >
    {children}
  </aside>
)

export const AdminPageColumns = ({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) => (
  <div
    className={cn(
      'mt-6 grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]',
      className,
    )}
  >
    {children}
  </div>
)
