import Link from 'next/link'
import { MobileBookingBar } from '@/components/layout/mobile-booking-bar'
import { SiteHeader } from '@/components/layout/site-header'
import { About } from '@/components/sections/about'
import { Contact } from '@/components/sections/contact'
import { Footer } from '@/components/sections/footer'
import { Hero } from '@/components/sections/hero'
import { Services } from '@/components/sections/services'
import { Button } from '@/components/ui/button'
import { contact } from '@/lib/constants/contact'

export default function Page() {
  return (
    <>
      <SiteHeader
        links={[
          { href: '#services', label: 'Nos prestations' },
          { href: '#about', label: 'À propos' },
          { href: '#contact', label: 'Contact' },
          { href: '/mes-rendez-vous', label: 'Mes rendez-vous' },
        ]}
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
        <main>
          <Hero />
          <Services />
          <About />
          <Contact />
        </main>
        <Footer />
      </div>
      <MobileBookingBar />
    </>
  )
}
