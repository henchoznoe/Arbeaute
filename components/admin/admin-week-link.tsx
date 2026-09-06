'use client'

import { LoaderCircle } from 'lucide-react'
import Link, { useLinkStatus } from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Une flèche de semaine qui montre clairement que la navigation a commencé.
 *
 * Changer de semaine dans l'agenda repasse par le serveur — environ neuf
 * requêtes et une invocation de fonction. Pendant tout ce temps, le routeur
 * garde l'écran précédent tel quel : rien ne bougeait, et le réflexe était de
 * recliquer. `useLinkStatus` donne l'état d'attente du lien le plus proche. La
 * roue remplace immédiatement la flèche et un message reste visible au-dessus
 * de la barre du bas sur mobile.
 *
 * Le préchargement reste automatique : le forcer demanderait à Next.js de
 * charger toute la route dynamique et déclencherait son avertissement de
 * préchargement instantané. L'état `pending` reste disponible au clic.
 */

const Arrow = ({ children }: Readonly<{ children: ReactNode }>) => {
  const { pending } = useLinkStatus()

  return (
    <>
      <span aria-hidden="true" className="grid size-5 place-items-center">
        {pending ? (
          <LoaderCircle className="size-5 animate-spin text-primary" />
        ) : (
          children
        )}
      </span>
      {pending ? (
        <span
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--admin-nav-height,5.25rem)+1rem)] z-[60] mx-auto flex min-h-12 max-w-sm items-center justify-center gap-2 rounded-2xl border bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-xl md:bottom-auto md:top-20"
        >
          <LoaderCircle className="size-5 animate-spin" />
          Chargement de la semaine…
        </span>
      ) : null}
    </>
  )
}

export const AdminWeekLink = ({
  children,
  href,
  label,
  variant = 'ghost',
}: Readonly<{
  children: ReactNode
  href: string
  label: string
  variant?: 'ghost' | 'outline'
}>) => (
  <Button asChild variant={variant} size="icon">
    <Link href={href} aria-label={label}>
      <Arrow>{children}</Arrow>
    </Link>
  </Button>
)
