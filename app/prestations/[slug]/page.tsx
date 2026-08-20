import { CalendarDays, ChevronLeft, Clock, FileText, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/public-shell'
import { Button } from '@/components/ui/button'
import { getServiceCareContent } from '@/lib/catalog/service-content'
import { findServiceBySlug, listServiceSlugs } from '@/lib/catalog/service-page'
import { createPageMetadata } from '@/lib/config/seo'
import { contact } from '@/lib/constants/contact'
import { buildServiceReservationPath } from '@/lib/reservation/deep-link'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import { getReadableInk } from '@/lib/utils/contrast'
import { formatPrice } from '@/lib/utils/format'

interface ServicePageProps {
  params: Promise<{ slug: string }>
}

/**
 * Une page par soin.
 *
 * Le catalogue portait déjà tout ce contenu — comment se préparer,
 * contre-indications, résultats attendus, suites du soin, trois
 * questions-réponses, note de prix — replié dans un dépliant « à savoir avant
 * de réserver », au milieu d'une page d'accueil de onze mille pixels. Personne
 * ne l'ouvrait, et rien de tout cela n'était indexable.
 *
 * Les adresses sont prérendues depuis le catalogue en cache. Cache Components
 * interdit `dynamicParams` : une prestation ajoutée après un déploiement sera
 * donc rendue à la demande jusqu'au suivant, ce qui est sans conséquence pour
 * une route de ce trafic.
 */
export const generateStaticParams = async (): Promise<{ slug: string }[]> => {
  const slugs = await listServiceSlugs()
  return slugs.map(slug => ({ slug }))
}

export const generateMetadata = async ({
  params,
}: ServicePageProps): Promise<Metadata> => {
  const { slug } = await params
  const found = await findServiceBySlug(slug)
  if (!found)
    return createPageMetadata({
      title: 'Prestation introuvable',
      description: 'Cette prestation n’est plus proposée par l’institut.',
      path: `/prestations/${slug}`,
      index: false,
    })

  const { service, category } = found
  return createPageMetadata({
    title: formatServiceLabel(service.name, category.name),
    description:
      service.description ??
      `${service.name} — ${category.name} chez ${contact.name}, à Bulle. ${service.durationMinutes} minutes, ${formatPrice(service.priceCents)}.`,
    path: `/prestations/${slug}`,
  })
}

const ServiceDetailPage = async ({ params }: ServicePageProps) => {
  const { slug } = await params
  const found = await findServiceBySlug(slug)
  if (!found) notFound()

  const { service, category, siblings } = found
  const { details, faq } = getServiceCareContent(service)
  const ink = getReadableInk(category.color)

  return (
    <PublicShell>
      <article>
        <section className="px-6 pt-28 pb-12 sm:pt-32">
          <div className="mx-auto max-w-5xl">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link href="/prestations">
                <ChevronLeft className="size-4" />
                Toutes les prestations
              </Link>
            </Button>

            <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              <div>
                <Link
                  href="/prestations"
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-widest uppercase ${
                    ink === 'light' ? 'text-ink-light' : 'text-ink-dark'
                  }`}
                  style={{ backgroundColor: category.color }}
                >
                  {category.name}
                </Link>
                <h1 className="mt-4 font-heading text-display font-semibold">
                  {service.name}
                </h1>
                {service.description ? (
                  <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                ) : null}

                <dl className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4">
                  <div>
                    <dt className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Tarif
                    </dt>
                    <dd className="mt-1 font-heading text-title font-semibold text-price">
                      {formatPrice(service.priceCents)}
                      {service.priceNote === '/ min' ? ' / min' : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Durée
                    </dt>
                    <dd className="mt-1 flex items-center gap-2 font-heading text-title font-semibold">
                      <Clock className="size-5 text-muted-foreground" />
                      {service.durationMinutes} min
                    </dd>
                  </div>
                </dl>

                {service.priceNote && service.priceNote !== '/ min' ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {service.priceNote}
                  </p>
                ) : null}

                {/* La barre fixe du bas s'efface quand un vrai bouton de
                    réservation est à l'écran : sans ce repère, les deux se
                    seraient superposés. */}
                <div
                  data-primary-booking-cta
                  className="mt-9 flex flex-wrap gap-3"
                >
                  {service.isBookable ? (
                    <Button
                      asChild
                      size="lg"
                      className="h-12 rounded-full px-8"
                    >
                      <Link href={buildServiceReservationPath(service.slug)}>
                        <CalendarDays className="size-5" />
                        Réserver ce soin
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="lg"
                      className="h-12 rounded-full px-8"
                    >
                      <a href={`tel:${contact.phoneRaw}`}>
                        <Phone className="size-5" />
                        Nous appeler
                      </a>
                    </Button>
                  )}
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-full px-8"
                  >
                    <a href={`tel:${contact.phoneRaw}`}>{contact.phone}</a>
                  </Button>
                </div>

                {service.isBookable ? null : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Cette prestation se prend par téléphone : sa durée dépend de
                    la zone traitée.
                  </p>
                )}
              </div>

              {service.imageUrl ? (
                <figure className="overflow-hidden rounded-3xl bg-muted shadow-sm">
                  <Image
                    src={service.imageUrl}
                    alt={`${service.name}, ${category.name}`}
                    width={880}
                    height={1100}
                    sizes="(min-width: 1024px) 42vw, 100vw"
                    priority
                    className="drift-on-scroll aspect-4/5 w-full object-cover"
                  />
                </figure>
              ) : null}
            </div>
          </div>
        </section>

        {details.length > 0 ? (
          <section className="bg-muted/35 px-6 py-20">
            <div className="mx-auto max-w-5xl">
              <h2 className="font-heading text-title font-semibold">
                Ce qu’il faut savoir
              </h2>
              <div className="mt-10 grid gap-10 sm:grid-cols-2">
                {details.map(detail => (
                  <div key={detail.label} className="reveal-on-scroll">
                    <h3 className="font-heading text-xl font-semibold">
                      {detail.label}
                    </h3>
                    <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {faq.length > 0 ? (
          <section className="px-6 py-20">
            <div className="mx-auto max-w-3xl">
              <h2 className="font-heading text-title font-semibold">
                Questions fréquentes
              </h2>
              <dl className="mt-10 divide-y border-y">
                {faq.map(item => (
                  <div key={item.question} className="py-6">
                    <dt className="font-heading text-lg font-semibold">
                      {item.question}
                    </dt>
                    <dd className="mt-2 whitespace-pre-line leading-relaxed text-muted-foreground">
                      {item.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        ) : null}

        {service.consentFormUrl ? (
          <section className="px-6 pb-20">
            <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-3xl border border-warning-accent bg-warning-subtle p-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-3 text-sm leading-relaxed text-warning-strong">
                <FileText className="mt-0.5 size-5 shrink-0" />
                <span>
                  <strong className="font-semibold">
                    Formulaire de consentement obligatoire.
                  </strong>{' '}
                  À imprimer, remplir et apporter le jour du rendez-vous. Sans
                  lui, le soin ne peut pas commencer.
                </span>
              </p>
              <Button
                asChild
                variant="outline"
                className="shrink-0 border-warning-accent bg-background"
              >
                <a
                  href={service.consentFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Télécharger (PDF)
                </a>
              </Button>
            </div>
          </section>
        ) : null}

        {siblings.length > 0 ? (
          <section className="border-t px-6 py-20">
            <div className="mx-auto max-w-5xl">
              <h2 className="font-heading text-title font-semibold">
                Aussi en {category.name.toLocaleLowerCase('fr-CH')}
              </h2>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {siblings.slice(0, 6).map(sibling => (
                  <li key={sibling.id}>
                    <Link
                      href={`/prestations/${sibling.slug}`}
                      className="flex h-full min-h-24 flex-col justify-between rounded-2xl border bg-card p-5 transition hover:border-primary hover:shadow-md"
                    >
                      <span className="font-medium">{sibling.name}</span>
                      <span className="mt-3 text-sm text-muted-foreground">
                        <span className="font-semibold text-price">
                          {formatPrice(sibling.priceCents)}
                        </span>{' '}
                        · {sibling.durationMinutes} min
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </article>
    </PublicShell>
  )
}

export default ServiceDetailPage
