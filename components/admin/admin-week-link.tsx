'use client'

import Link, { useLinkStatus } from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Une flèche de semaine qui dit qu'elle a été pressée.
 *
 * Changer de semaine dans l'agenda repasse par le serveur — environ neuf
 * requêtes et une invocation de fonction. Pendant tout ce temps, le routeur
 * garde l'écran précédent tel quel : rien ne bougeait, et le réflexe était de
 * recliquer. `useLinkStatus` donne l'état d'attente du lien le plus proche, ce
 * qui permet de l'annoncer dans la même image que le clic.
 *
 * Le préchargement reste automatique : le forcer demanderait à Next.js de
 * charger toute la route dynamique et déclencherait son avertissement de
 * préchargement instantané. L'état `pending` reste disponible au clic.
 */

const Arrow = ({ children }: Readonly<{ children: ReactNode }>) => {
  const { pending } = useLinkStatus()

  return (
    <span
      aria-busy={pending}
      className={
        pending ? 'block animate-pulse opacity-60 transition' : 'block'
      }
    >
      {children}
    </span>
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
