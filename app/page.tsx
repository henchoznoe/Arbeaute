import Link from 'next/link'
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
            className="h-9 rounded-full px-4 text-sm sm:h-11 sm:px-6 sm:text-base"
          >
            <Link href={contact.bookingUrl}>Réserver</Link>
          </Button>
        }
      />
      <main>
        <Hero />
        <Services />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
