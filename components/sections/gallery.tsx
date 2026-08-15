import Image from 'next/image'
import { Animate } from '@/components/ui/animate'
import { getPublicCatalog } from '@/lib/catalog/queries'

export async function Gallery() {
  const categories = await getPublicCatalog()
  const images = categories
    .flatMap(category => {
      const service = category.services.find(item => item.imageUrl)
      return service?.imageUrl
        ? [{ ...service, categoryName: category.name }]
        : []
    })
    .slice(0, 4)

  if (images.length === 0) return null

  return (
    <section className="overflow-hidden bg-muted/35 px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Animate>
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-medium tracking-[0.2em] text-brand uppercase">
              L’univers Arbeauté
            </p>
            <h2 className="mt-2 font-heading text-title font-bold">
              Quelques soins en images
            </h2>
            <p className="mt-3 text-muted-foreground">
              Découvrez une sélection des prestations proposées à l’institut.
            </p>
          </div>
        </Animate>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {images.map((service, index) => (
            <Animate key={service.id} animation="scale-in" delay={index * 80}>
              <figure className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted shadow-sm">
                <Image
                  src={service.imageUrl ?? ''}
                  alt={`${service.name} — ${service.categoryName}`}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/35 to-transparent px-4 pt-14 pb-4 text-white">
                  <span className="block font-medium">{service.name}</span>
                  <span className="mt-0.5 block text-xs text-white/75">
                    {service.categoryName}
                  </span>
                </figcaption>
              </figure>
            </Animate>
          ))}
        </div>
      </div>
    </section>
  )
}
