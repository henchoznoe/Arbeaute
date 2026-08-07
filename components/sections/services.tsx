import Image from 'next/image'
import Link from 'next/link'
import { Animate } from '@/components/ui/animate'
import { Button } from '@/components/ui/button'
import { contact } from '@/lib/constants/contact'
import prisma from '@/lib/core/prisma'

const formatPrice = (priceCents: number): string =>
  `${(priceCents / 100).toLocaleString('fr-CH')} CHF`

export async function Services() {
  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      services: {
        where: { isVisible: true, isArchived: false },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      },
    },
  })

  return (
    <section id="services" className="scroll-mt-16 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Animate>
          <div className="mb-16 text-center">
            <p className="mb-2 text-sm font-medium tracking-[0.2em] text-rose-400/80 uppercase">
              Ce que nous proposons
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Nos prestations
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Découvrez notre gamme complète de soins esthétiques et leurs
              tarifs.
            </p>
          </div>
        </Animate>

        <div className="columns-1 gap-8 lg:columns-2">
          {categories.map((category, index) => (
            <Animate
              key={category.id}
              animation="fade-up"
              delay={(index % 4) * 75}
              className="mb-8 break-inside-avoid"
            >
              <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <header
                  className="px-5 py-4 text-primary-foreground"
                  style={{ backgroundColor: category.color }}
                >
                  <h3 className="font-heading text-xl font-bold uppercase">
                    {category.name}
                  </h3>
                  {category.description ? (
                    <p className="mt-1 text-sm text-white/80">
                      {category.description}
                    </p>
                  ) : null}
                </header>
                <div className="divide-y">
                  {category.services.map(service => (
                    <div
                      key={service.id}
                      className="flex items-center gap-3 px-4 py-3 even:bg-muted/45"
                    >
                      {service.imageUrl ? (
                        <Image
                          src={service.imageUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="size-12 shrink-0 rounded-lg object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{service.name}</p>
                        {service.description ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {service.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-[#927b59]">
                          {formatPrice(service.priceCents)}
                          {service.priceNote === '/ min' ? ' / min' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {service.durationMinutes} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </Animate>
          ))}
        </div>

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
