import { CalendarCheck, Clock, Mail, MapPin, Phone } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { PublicShell } from '@/components/layout/public-shell'
import { Button } from '@/components/ui/button'
import { Skeleton, skeletonKeys } from '@/components/ui/skeleton'
import { contactPlaceholder } from '@/lib/config/placeholders'
import { createPageMetadata } from '@/lib/config/seo'
import { contact } from '@/lib/constants/contact'
import { getOpeningHours } from '@/lib/reservation/opening-hours'

export const metadata = createPageMetadata({
  title: 'Contact et horaires',
  description:
    'Institut Arbeauté, Place du marché 25 à Bulle. Horaires d’ouverture, téléphone et accès. Uniquement sur rendez-vous.',
  path: '/contact',
})

const hoursSkeletonKeys = skeletonKeys(7)

/**
 * Les horaires viennent des disponibilités hebdomadaires de l'administration :
 * modifier l'agenda modifie la page publique, sans qu'aucun texte n'ait à être
 * repris. La lecture est en cache sous `OPENING_HOURS_TAG`, ce qui la laisse
 * dans la coquille prérendue.
 */
const OpeningHours = async () => {
  const hours = await getOpeningHours()

  return (
    <dl className="divide-y">
      {hours.map(({ day, ranges }) => (
        <div key={day} className="flex justify-between gap-4 py-3">
          <dt className="font-medium">{day}</dt>
          <dd className="text-right text-muted-foreground tabular-nums">
            {ranges.length > 0
              ? ranges.map(range => `${range.start} – ${range.end}`).join(', ')
              : 'Fermé'}
          </dd>
        </div>
      ))}
    </dl>
  )
}

const ContactPage = () => (
  <PublicShell>
    <section className="px-6 pt-28 pb-14 sm:pt-32">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
          Nous trouver
        </p>
        <h1 className="mt-3 max-w-2xl font-heading text-display font-semibold">
          Place du marché, à Bulle.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
          L’institut reçoit <strong>uniquement sur rendez-vous</strong>.
          Réservez en ligne, ou appelez : les deux mènent au même agenda.
        </p>
      </div>
    </section>

    <section className="px-6 pb-20">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-8">
          <div>
            <h2 className="flex items-center gap-3 font-heading text-xl font-semibold">
              <MapPin className="size-5 text-brand" aria-hidden="true" />
              Adresse
            </h2>
            <a
              href={contact.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center text-lg text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {contact.address}
            </a>
            <p className="mt-4 flex items-start gap-2 rounded-2xl border border-brand-line bg-brand-subtle p-4 text-sm font-medium text-brand-strong">
              <CalendarCheck
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              Aucune visite à l’improviste n’est possible : chaque créneau est
              réservé à une personne.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href={`tel:${contact.phoneRaw}`}
              className="flex min-h-24 flex-col justify-center rounded-2xl border bg-card p-5 transition hover:border-primary hover:shadow-md"
            >
              <span className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                <Phone className="size-4" aria-hidden="true" />
                Téléphone
              </span>
              <span className="mt-2 font-medium">{contact.phone}</span>
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="flex min-h-24 flex-col justify-center rounded-2xl border bg-card p-5 transition hover:border-primary hover:shadow-md"
            >
              <span className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                <Mail className="size-4" aria-hidden="true" />
                E-mail
              </span>
              <span className="mt-2 break-all font-medium">
                {contact.email}
              </span>
            </a>
          </div>

          <div>
            <h2 className="flex items-center gap-3 font-heading text-xl font-semibold">
              <Clock className="size-5 text-brand" aria-hidden="true" />
              Horaires d’ouverture
            </h2>
            <div className="mt-3">
              <Suspense
                fallback={
                  <div aria-hidden="true" className="space-y-3 py-3">
                    {hoursSkeletonKeys.map(key => (
                      <Skeleton key={key} className="h-6" />
                    ))}
                  </div>
                }
              >
                <OpeningHours />
              </Suspense>
            </div>
          </div>

          <div data-primary-booking-cta>
            <Button asChild size="lg" className="h-12 w-full rounded-full">
              <Link href={contact.bookingUrl}>Réserver en ligne</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <figure className="overflow-hidden rounded-3xl bg-muted">
            {/* Photo d'attente, voir `lib/config/placeholders.ts`. */}
            <Image
              src={contactPlaceholder.src}
              alt={contactPlaceholder.alt}
              width={1400}
              height={900}
              sizes="(min-width: 1024px) 55vw, 100vw"
              priority
              unoptimized
              className="aspect-3/2 w-full object-cover"
            />
          </figure>
          {/* Le cadre Google n'est chargé qu'à partir de `lg` : sur un
              téléphone, le lien vers Maps rend le même service sans faire
              intervenir un tiers. */}
          <iframe
            src={contact.mapsEmbed}
            title={`Carte — ${contact.name}, ${contact.address}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="hidden h-80 w-full rounded-3xl border lg:block"
          />
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 w-full rounded-full lg:hidden"
          >
            <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer">
              Ouvrir dans Maps
            </a>
          </Button>
        </div>
      </div>
    </section>
  </PublicShell>
)

export default ContactPage
