import Link from 'next/link'
import { Animate } from '@/components/ui/animate'
import { Button } from '@/components/ui/button'
import { getPublicCatalog } from '@/lib/catalog/queries'
import { contact } from '@/lib/constants/contact'
import { ServiceCatalog } from './service-catalog'

export async function Services() {
  const categories = await getPublicCatalog()

  return (
    <section id="services" className="scroll-mt-16 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Animate>
          <div className="mb-16 text-center">
            <p className="mb-2 text-sm font-medium tracking-[0.2em] text-brand uppercase">
              Ce que nous proposons
            </p>
            <h2 className="font-heading text-title font-bold">
              Nos prestations
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Découvrez notre gamme complète de soins esthétiques et leurs
              tarifs.
            </p>
          </div>
        </Animate>

        <ServiceCatalog categories={categories} />

        <Animate animation="fade-up" delay={200}>
          <div className="mt-12 text-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full px-8 text-base"
            >
              <Link href={contact.bookingUrl}>Réserver en ligne</Link>
            </Button>
          </div>
        </Animate>
      </div>
    </section>
  )
}
