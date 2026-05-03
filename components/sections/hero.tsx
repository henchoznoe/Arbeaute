import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { contact } from '@/lib/constants/contact'

export function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="absolute inset-0 bg-linear-to-br from-rose-50 via-amber-50/60 to-orange-50/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-rose-100/40 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <p className="mb-4 text-sm font-medium tracking-[0.3em] text-rose-400/80 uppercase">
          Soins esthétiques à Bulle
        </p>

        <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
          Arbeauté
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Un large éventail de soins esthétiques professionnels : épilation
          laser, soins du visage, onglerie, microblading et bien plus encore.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-full px-8 text-base"
          >
            <Link
              href={contact.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Prendre rendez-vous
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 rounded-full px-8 text-base"
          >
            <Link href="#services">Nos prestations</Link>
          </Button>
        </div>
      </div>

      <div className="absolute bottom-8 animate-bounce">
        <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/30">
          <div className="mx-auto mt-1.5 h-2 w-1 rounded-full bg-muted-foreground/40" />
        </div>
      </div>
    </section>
  )
}
