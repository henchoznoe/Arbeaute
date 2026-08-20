import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getPublicCatalog } from '@/lib/catalog/queries'
import { formatPrice } from '@/lib/utils/format'

/**
 * Six prestations sur la page d'accueil, plus trente-quatre.
 *
 * L'accueil portait le catalogue entier : onze mille six cents pixels de
 * défilement sur un téléphone, dont l'essentiel avant même d'avoir vu Arzu ou
 * l'adresse de l'institut. Le catalogue vit maintenant sur `/prestations` ;
 * l'accueil n'en montre qu'un échantillon, un par famille, pour dire ce que
 * l'institut fait sans le dérouler.
 */
const FEATURED_COUNT = 6

export const FeaturedServices = async () => {
  const categories = await getPublicCatalog()

  // Un soin par famille, celui que l'ordre d'affichage met en tête : c'est
  // l'ordre qu'Arzu décide depuis l'administration, et il vaut mieux que
  // n'importe quel classement deviné ici.
  const featured = categories
    .flatMap(category => {
      const service = category.services.find(item => item.imageUrl)
      return service ? [{ ...service, categoryName: category.name }] : []
    })
    .slice(0, FEATURED_COUNT)

  if (featured.length === 0) return null

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
              Ce que nous proposons
            </p>
            <h2 className="mt-3 max-w-lg font-heading text-title font-semibold">
              Du laser à l’onglerie, en passant par le regard.
            </h2>
          </div>
          <Button asChild variant="outline" className="h-11 rounded-full px-6">
            <Link href="/prestations">
              Les {categories.reduce((n, c) => n + c.services.length, 0)}{' '}
              prestations
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {/* Deux colonnes dès le plus petit écran : six cartes pleine largeur
            faisaient à elles seules près de trois mille pixels, soit exactement
            le défaut qu'on vient de retirer de cette page. */}
        <ul className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {featured.map((service, index) => (
            <li
              key={service.id}
              className={`reveal-on-scroll ${index % 3 === 1 ? 'lg:mt-10' : ''}`}
            >
              <Link
                href={`/prestations/${service.slug}`}
                className="group block overflow-hidden rounded-3xl border bg-card transition hover:border-primary hover:shadow-lg"
              >
                <span className="block overflow-hidden bg-muted">
                  <Image
                    src={service.imageUrl ?? ''}
                    alt=""
                    width={800}
                    height={1000}
                    sizes="(min-width: 1024px) 30vw, 46vw"
                    className="aspect-4/5 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </span>
                <span className="block p-4 sm:p-5">
                  <span className="text-2xs font-semibold tracking-widest text-brand uppercase sm:text-xs">
                    {service.categoryName}
                  </span>
                  <span className="mt-1.5 block font-heading text-base font-semibold text-balance sm:mt-2 sm:text-xl">
                    {service.name}
                  </span>
                  <span className="mt-2 flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground sm:mt-3 sm:text-sm">
                    <span className="font-semibold text-price">
                      {formatPrice(service.priceCents)}
                      {service.priceNote === '/ min' ? ' / min' : ''}
                    </span>
                    · {service.durationMinutes} min
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
