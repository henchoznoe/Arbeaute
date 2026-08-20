import { ArrowRight, Clock, MapPin, UserRound } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/public-shell'
import { FeaturedServices } from '@/components/sections/featured-services'
import { Gallery } from '@/components/sections/gallery'
import { Hero } from '@/components/sections/hero'
import { Button } from '@/components/ui/button'
import { bio, contact } from '@/lib/constants/contact'

/**
 * L'accueil, allégé.
 *
 * Il portait le catalogue entier — trente-quatre prestations, onze mille six
 * cents pixels sur un téléphone. Le catalogue est parti sur `/prestations`, le
 * détail d'un soin sur `/prestations/[slug]`, Arzu sur `/institut` et l'adresse
 * sur `/contact`. Ce qui reste ici est une invitation, pas un annuaire.
 */

const highlights = [
  {
    icon: UserRound,
    title: 'Un accueil personnel',
    body: 'Une seule praticienne, du premier conseil jusqu’au dernier geste.',
  },
  {
    icon: Clock,
    title: 'Du temps pour vous',
    body: 'Chaque visite occupe son créneau, sans attente ni chevauchement.',
  },
  {
    icon: MapPin,
    title: 'Au cœur de Bulle',
    body: 'Un institut indépendant, à deux pas de la place du marché.',
  },
]

const Page = () => (
  <PublicShell>
    <Hero />

    <section
      aria-label="Les engagements Arbeauté"
      className="border-y bg-muted/30 px-6 py-14"
    >
      <ul className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
        {highlights.map(item => {
          const Icon = item.icon
          return (
            <li key={item.title} className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-subtle text-brand-strong">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-heading text-lg font-semibold">
                  {item.title}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>

    <FeaturedServices />

    <Gallery />

    <section className="px-6 py-24">
      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[0.8fr_1fr] md:items-center">
        <figure className="overflow-hidden rounded-3xl bg-muted shadow-sm">
          <Image
            src="/arzu.jpeg"
            alt={contact.owner}
            width={1080}
            height={1350}
            sizes="(min-width: 768px) 36vw, 100vw"
            className="drift-on-scroll aspect-4/5 w-full object-cover object-top"
          />
        </figure>
        <div className="reveal-on-scroll">
          <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
            Votre esthéticienne
          </p>
          <h2 className="mt-3 font-heading text-title font-semibold">
            {contact.owner}
          </h2>
          <blockquote className="mt-6 leading-relaxed text-muted-foreground italic">
            « {bio} »
          </blockquote>
          <Button
            asChild
            variant="outline"
            className="mt-8 h-11 rounded-full px-6"
          >
            <Link href="/institut">
              Découvrir l’institut
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>

    <section className="border-t bg-brand-subtle/50 px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-title font-semibold">
          {contact.address}
        </h2>
        <p className="mt-4 text-muted-foreground">
          Uniquement sur rendez-vous. Réservez en ligne, ou appelez le{' '}
          <a
            href={`tel:${contact.phoneRaw}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {contact.phone}
          </a>
          .
        </p>
        <div
          data-primary-booking-cta
          className="mt-8 flex flex-wrap justify-center gap-3"
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
            <Link href="/contact">Horaires et accès</Link>
          </Button>
        </div>
      </div>
    </section>
  </PublicShell>
)

export default Page
