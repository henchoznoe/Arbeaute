import Link from 'next/link'
import type { ReactNode } from 'react'
import { MobileBookingBar } from '@/components/layout/mobile-booking-bar'
import { SiteHeader } from '@/components/layout/site-header'
import { Footer } from '@/components/sections/footer'
import { Button } from '@/components/ui/button'
import { MAIN_CONTENT_ID } from '@/components/ui/skip-link'
import { contact } from '@/lib/constants/contact'

/**
 * L'enveloppe des pages de la vitrine.
 *
 * La vitrine tenait sur une seule page, et son en-tête, son pied de page et sa
 * barre de réservation étaient écrits dans `app/page.tsx`. Avec cinq pages, les
 * recopier cinq fois aurait garanti qu'elles finissent par diverger — et
 * surtout que la barre de réservation manque là où elle sert le plus.
 *
 * Le dégagement du bas réserve la place de cette barre, safe area iOS
 * comprise ; au-delà de `sm`, la barre n'existe pas et le dégagement non plus.
 */

const PUBLIC_LINKS = [
  { href: '/prestations', label: 'Prestations' },
  { href: '/institut', label: 'L’institut' },
  { href: '/contact', label: 'Contact' },
  { href: '/mes-rendez-vous', label: 'Mes rendez-vous' },
] as const

export const PublicShell = ({
  children,
}: Readonly<{ children: ReactNode }>) => (
  <>
    <SiteHeader
      links={[...PUBLIC_LINKS]}
      actions={
        <Button
          asChild
          size="lg"
          className="hidden h-11 rounded-full px-6 text-base sm:inline-flex"
        >
          <Link href={contact.bookingUrl}>Réserver</Link>
        </Button>
      }
    />
    <div className="pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:pb-0">
      <main id={MAIN_CONTENT_ID}>{children}</main>
      <Footer />
    </div>
    <MobileBookingBar />
  </>
)
