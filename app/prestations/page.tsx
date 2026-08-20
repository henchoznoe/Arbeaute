import Link from 'next/link'
import { PublicShell } from '@/components/layout/public-shell'
import { ServiceCatalog } from '@/components/sections/service-catalog'
import { Button } from '@/components/ui/button'
import { getPublicCatalog } from '@/lib/catalog/queries'
import { createPageMetadata } from '@/lib/config/seo'
import { contact } from '@/lib/constants/contact'

export const metadata = createPageMetadata({
  title: 'Nos prestations',
  description:
    'Épilation laser, soins du visage, onglerie, microblading, endosphères : toutes les prestations de l’institut Arbeauté à Bulle, avec leurs tarifs et leurs durées.',
  path: '/prestations',
})

/**
 * Le catalogue, désormais chez lui.
 *
 * Il vivait au milieu de la page d'accueil, qu'il portait à plus de onze mille
 * pixels sur un téléphone : les trente-quatre prestations passaient avant la
 * galerie, avant Arzu et avant le contact. Ici, la recherche et les pastilles
 * de groupe sont ce que la page fait, et la page d'accueil ne montre plus que
 * quelques soins.
 */
const ServicesPage = async () => {
  const categories = await getPublicCatalog()

  return (
    <PublicShell>
      <section className="px-6 pt-28 pb-16 sm:pt-32">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
            Le catalogue
          </p>
          <h1 className="mt-3 max-w-3xl font-heading text-display font-semibold">
            Chaque soin, son temps et son prix.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Cherchez par nom, filtrez par famille, ouvrez une prestation pour
            savoir comment elle se déroule et comment s’y préparer.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <ServiceCatalog categories={categories} />

          <div className="reveal-on-scroll mt-16 rounded-3xl border bg-brand-subtle/60 px-6 py-12 text-center">
            <h2 className="font-heading text-title font-semibold text-foreground">
              Un doute sur le soin qui vous conviendrait&nbsp;?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Appelez l’institut : {contact.owner} vous dira en deux minutes ce
              qui est adapté, et ce qui ne l’est pas.
            </p>
            <div
              data-primary-booking-cta
              className="mt-7 flex flex-wrap justify-center gap-3"
            >
              <Button asChild size="lg" className="h-12 rounded-full px-8">
                <Link href={contact.bookingUrl}>Réserver en ligne</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-full px-8"
              >
                <a href={`tel:${contact.phoneRaw}`}>{contact.phone}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}

export default ServicesPage
