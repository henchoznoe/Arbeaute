'use client'

import { CalendarCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Animate } from '@/components/ui/animate'
import { Button } from '@/components/ui/button'
import { contact } from '@/lib/constants/contact'

export function Hero() {
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden px-5 pt-20 pb-8 sm:px-8">
      <div className="absolute inset-0 bg-linear-to-br from-brand-subtle via-warning-subtle/70 to-warning-subtle/40" />
      <div className="absolute -top-32 -right-32 size-96 rounded-full bg-brand-line/25 blur-3xl" />
      <div className="absolute -bottom-40 -left-32 size-96 rounded-full bg-warning-line/25 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="relative z-10">
          <Animate animation="fade-in" delay={100}>
            <p className="pr-28 text-xs font-medium tracking-[0.25em] text-brand uppercase sm:pr-36 sm:text-sm md:pr-0">
              Soins esthétiques à Bulle
            </p>
          </Animate>

          <Animate animation="fade-up" delay={200}>
            <h1 className="mt-3 pr-24 font-heading text-display font-bold text-foreground sm:pr-32 md:pr-0">
              La beauté,
              <span className="block text-primary">avec attention.</span>
            </h1>
          </Animate>

          <Animate animation="fade-up" delay={300}>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Arzu vous accueille personnellement pour des soins esthétiques
              adaptés à vos envies, dans son institut au cœur de Bulle.
            </p>
          </Animate>

          <Animate animation="fade-up" delay={400}>
            <p className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-line/70 bg-background/75 px-4 text-sm font-medium text-brand-strong shadow-sm backdrop-blur-sm">
              <CalendarCheck className="size-4 shrink-0" />
              Uniquement sur rendez-vous
            </p>
          </Animate>

          <Animate animation="fade-up" delay={500}>
            <div data-primary-booking-cta className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 flex-1 rounded-full px-6 text-base sm:flex-none"
              >
                <Link href={contact.bookingUrl}>Prendre rendez-vous</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 flex-1 rounded-full bg-background/60 px-6 text-base sm:flex-none"
              >
                <Link href="#services">Voir les soins</Link>
              </Button>
            </div>
          </Animate>
        </div>

        <Animate
          animation="scale-in"
          delay={250}
          className="absolute top-1 right-0 md:static"
        >
          <div className="relative size-24 overflow-hidden rounded-3xl border-4 border-background shadow-xl sm:size-28 md:aspect-[4/5] md:h-auto md:w-full md:max-w-md md:rounded-4xl md:border-8">
            <Image
              src="/arzu.jpeg"
              alt="Arzu Yurdakul, esthéticienne chez Arbeauté"
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 768px) 42vw, 128px"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 hidden bg-linear-to-t from-black/55 to-transparent px-6 pt-20 pb-6 text-white md:block">
              <p className="font-heading text-2xl font-bold">Arzu Yurdakul</p>
              <p className="mt-1 text-sm text-white/85">
                Votre esthéticienne à Bulle
              </p>
            </div>
          </div>
        </Animate>
      </div>
    </section>
  )
}
