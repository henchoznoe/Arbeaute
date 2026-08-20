import { CalendarCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { heroPlaceholder } from '@/lib/config/placeholders'
import { contact } from '@/lib/constants/contact'

/**
 * Premier écran, éditorial.
 *
 * La version précédente centrait tout sur un dégradé et deux taches floues :
 * le premier écran n'avait aucune image, et la page entière avait ensuite le
 * même rythme du haut en bas. Ici, une photo occupe la moitié droite sur grand
 * écran et le tiers bas sur téléphone, le titre est en serif, et le contenu
 * reste ancré en haut sur mobile — centré, il laissait un quart d'écran vide
 * au-dessus du titre.
 *
 * Plus de composant client : le hero n'avait besoin de React que pour ses
 * animations d'entrée, désormais faites en CSS.
 */
export const Hero = () => (
  <section className="relative overflow-hidden px-5 pt-24 pb-0 sm:px-8 md:pt-28 md:pb-20">
    <div className="absolute inset-0 -z-10 bg-linear-to-b from-brand-subtle/70 via-background to-background" />

    <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-center lg:gap-16">
      <div className="pb-12 md:pb-0">
        <div className="flex items-center gap-3">
          <span className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-background shadow-md md:hidden">
            <Image
              src="/arzu.jpeg"
              alt=""
              fill
              loading="eager"
              fetchPriority="high"
              sizes="48px"
              className="object-cover"
            />
          </span>
          <span className="text-xs font-semibold tracking-[0.2em] text-brand uppercase sm:text-sm">
            Soins esthétiques à Bulle
          </span>
        </div>

        <h1 className="mt-6 font-heading text-display font-semibold text-balance">
          La beauté,
          <span className="block text-brand-strong">avec attention.</span>
        </h1>

        <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
          {contact.owner} vous reçoit seule, sur rendez-vous, dans son institut
          au cœur de Bulle. Un créneau, une personne, un soin.
        </p>

        <div
          data-primary-booking-cta
          className="mt-9 flex flex-col gap-3 sm:flex-row"
        >
          <Button
            asChild
            size="lg"
            className="h-12 rounded-full px-8 text-base"
          >
            <Link href={contact.bookingUrl}>Prendre rendez-vous</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 rounded-full px-8 text-base"
          >
            <Link href="/prestations">Voir les prestations</Link>
          </Button>
        </div>

        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarCheck className="size-4 text-brand" aria-hidden="true" />
          Uniquement sur rendez-vous
        </p>
      </div>

      {/* Photo d'attente : elle part avec `lib/config/placeholders.ts` dès que
          celles de l'institut arrivent. Pleine largeur sous `md`, où elle
          termine l'écran au lieu de le laisser sur un aplat. */}
      <figure className="-mx-5 overflow-hidden sm:-mx-8 md:mx-0 md:rounded-3xl">
        <Image
          src={heroPlaceholder.src}
          alt={heroPlaceholder.alt}
          width={1600}
          height={1800}
          sizes="(min-width: 768px) 46vw, 100vw"
          priority
          unoptimized
          className="aspect-3/2 w-full object-cover md:aspect-4/5"
        />
      </figure>
    </div>
  </section>
)
