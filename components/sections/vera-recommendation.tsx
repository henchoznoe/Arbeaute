import { ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

const SKIN_ANALYSIS_URL = 'https://nskn.co/Xg1Fdf'

export const VeraRecommendation = () => (
  <section
    aria-labelledby="skin-analysis-title"
    className="px-4 py-16 sm:px-6 sm:py-24"
  >
    <div className="mx-auto grid max-w-6xl items-center overflow-hidden rounded-4xl border bg-card shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(24rem,28rem)]">
      <div className="reveal-on-scroll p-7 sm:p-10 lg:p-14">
        <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
          La recommandation d’Arzu
        </p>
        <h2
          id="skin-analysis-title"
          className="mt-3 max-w-xl font-heading text-title font-semibold"
        >
          Découvrez les besoins de votre peau
        </h2>
        <p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">
          Faites une analyse de peau personnalisée et découvrez les produits
          adaptés à vos besoins.
        </p>

        <Button
          asChild
          size="lg"
          className="mt-8 w-full rounded-full px-7 sm:w-auto"
        >
          <a
            href={SKIN_ANALYSIS_URL}
            target="_blank"
            rel="sponsored noopener noreferrer"
          >
            Faire mon analyse de peau
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </Button>
      </div>

      <figure className="border-t bg-brand-subtle p-4 sm:p-6 lg:border-t-0 lg:border-l lg:p-8">
        <Image
          src="/images/analyse-peau-vera.webp"
          alt="Présentation de l’analyse de peau recommandée par Arzu"
          width={1024}
          height={1536}
          unoptimized
          sizes="(min-width: 1024px) 24rem, (min-width: 640px) 28rem, calc(100vw - 4rem)"
          className="mx-auto h-auto w-full max-w-md rounded-3xl shadow-sm"
        />
      </figure>
    </div>
  </section>
)
