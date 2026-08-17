'use client'

import { CalendarCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Animate } from '@/components/ui/animate'
import { Button } from '@/components/ui/button'
import { contact } from '@/lib/constants/contact'

/**
 * Premier écran, pensé pour un téléphone tenu à une main.
 *
 * Le contenu est ancré en haut sur mobile plutôt que centré dans une hauteur
 * d'écran complète : centré, il laissait un quart de l'écran de dégradé vide
 * au-dessus du titre et repoussait l'appel à l'action. La pleine hauteur ne
 * revient qu'à partir de `md`, où elle a de la place pour respirer.
 */
export function Hero() {
  return (
    <section className="relative flex overflow-hidden px-5 pt-24 pb-12 sm:px-8 md:min-h-svh md:items-center md:pt-20 md:pb-8">
      <div className="absolute inset-0 bg-linear-to-br from-brand-subtle via-warning-subtle/70 to-warning-subtle/40" />
      <div className="absolute -top-32 -right-32 size-96 rounded-full bg-brand-line/25 blur-3xl" />
      <div className="absolute -bottom-40 -left-32 size-96 rounded-full bg-warning-line/25 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="relative z-10">
          {/* Sur mobile, la photo entre dans la composition au lieu d'être
              posée dans le coin : le titre récupère toute la largeur, sans
              marge droite codée en dur. */}
          <Animate animation="fade-in" delay={100}>
            <div className="flex items-center gap-3 md:block">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-full border-2 border-background shadow-md md:hidden">
                <Image
                  src="/arzu.jpeg"
                  alt="Arzu Yurdakul, esthéticienne chez Arbeauté"
                  fill
                  loading="eager"
                  fetchPriority="high"
                  sizes="56px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium tracking-[0.2em] text-brand uppercase sm:text-sm">
                  Soins esthétiques à Bulle
                </span>
                <span className="block text-sm font-semibold text-foreground md:hidden">
                  Arzu Yurdakul
                </span>
              </span>
            </div>
          </Animate>

          <Animate animation="fade-up" delay={200}>
            <h1 className="mt-4 font-heading text-display font-bold text-foreground">
              La beauté,
              <span className="block text-primary">avec attention.</span>
            </h1>
          </Animate>

          <Animate animation="fade-up" delay={300}>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Arzu vous accueille personnellement pour des soins esthétiques
              adaptés à vos envies, dans son institut au cœur de Bulle.
            </p>
          </Animate>

          <Animate animation="fade-up" delay={400}>
            {/* Une grille plutôt qu'un `flex` : les colonnes sont égales, donc
                les deux actions ont exactement la même largeur. Elles restent
                empilées jusqu'à `lg` — côte à côte dans la colonne étroite du
                bureau, « Prendre rendez-vous » venait toucher ses bords. */}
            <div
              data-primary-booking-cta
              className="mt-7 grid gap-3 lg:max-w-lg lg:grid-cols-2"
            >
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-6 text-base"
              >
                <Link href={contact.bookingUrl}>Prendre rendez-vous</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-full bg-background/60 px-6 text-base"
              >
                <Link href="#services">Voir les soins</Link>
              </Button>
            </div>
          </Animate>

          <Animate animation="fade-up" delay={500}>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarCheck className="size-4 shrink-0 text-brand" />
              Uniquement sur rendez-vous
            </p>
          </Animate>
        </div>

        {/* Sans `Animate` : le portrait est au-dessus de la ligne de flottaison,
            une entrée déclenchée au défilement n'a rien à déclencher. Enveloppé
            dans un `Animate` masqué en `hidden md:block`, il restait même
            invisible — l'observateur d'intersection ne se déclenche pas sur un
            élément né sans boîte. */}
        <div className="hidden md:block">
          <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-4xl border-8 border-background shadow-xl">
            {/* `lazy` et non `eager` : sur téléphone ce portrait est en
                `display:none`, et un `eager` le ferait tout de même
                télécharger. Sur ordinateur il est dans l'écran au chargement,
                donc le navigateur le récupère quand même. */}
            <Image
              src="/arzu.jpeg"
              alt=""
              fill
              loading="lazy"
              sizes="42vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/55 to-transparent px-6 pt-20 pb-6 text-white">
              <p className="font-heading text-2xl font-bold">Arzu Yurdakul</p>
              <p className="mt-1 text-sm text-white/85">
                Votre esthéticienne à Bulle
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
