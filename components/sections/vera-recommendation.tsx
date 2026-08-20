import { Check, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

const VERA_AFFILIATE_URL = 'https://nskn.co/9Xmsb0'

const benefits = [
  'Un questionnaire et un selfie guidés',
  'Des recommandations de produits adaptées',
  'Le catalogue Nu Skin à portée de main',
]

export const VeraRecommendation = () => (
  <section aria-labelledby="vera-title" className="px-6 py-20 sm:py-24">
    <div className="mx-auto grid max-w-6xl overflow-hidden rounded-4xl bg-vera text-ink-light shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
      <div className="reveal-on-scroll p-7 sm:p-10 lg:p-14">
        <p className="text-sm font-semibold tracking-[0.2em] text-ink-light/80 uppercase">
          La recommandation d’Arzu
        </p>
        <h2
          id="vera-title"
          className="mt-3 max-w-xl font-heading text-title font-semibold"
        >
          Votre routine beauté, guidée par Vera
        </h2>
        <blockquote className="mt-5 max-w-xl leading-relaxed text-ink-light/90 italic">
          « J’adore Vera depuis que je l’utilise et j’ai pensé que ça pourrait
          vous plaire. »
        </blockquote>
        <p className="mt-5 max-w-xl leading-relaxed text-ink-light/90">
          Répondez à quelques questions et prenez un selfie pour recevoir des
          recommandations de produits Nu Skin adaptées aux besoins que vous
          indiquez.
        </p>

        <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          {benefits.map(benefit => (
            <li key={benefit} className="flex items-start gap-2">
              <Check
                className="mt-0.5 size-4 shrink-0 text-ink-light/80"
                aria-hidden="true"
              />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <Button
          asChild
          variant="inverse"
          size="lg"
          className="mt-8 rounded-full px-7 text-vera-strong"
        >
          <a
            href={VERA_AFFILIATE_URL}
            target="_blank"
            rel="sponsored noopener noreferrer"
          >
            Découvrir Vera
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </Button>

        <p className="mt-4 max-w-xl text-xs leading-relaxed text-ink-light/80">
          Vera est un service externe de Nu Skin. Lien affilié : Arzu peut
          recevoir une commission si vous commandez après l’avoir utilisé.
        </p>
      </div>

      <figure className="relative min-h-64 overflow-hidden lg:min-h-full">
        <Image
          src="/images/vera-nu-skin-app.webp"
          alt="Aperçu de l’application Nu Skin Vera"
          fill
          unoptimized
          sizes="(min-width: 1024px) 42vw, 100vw"
          className="object-cover object-[82%_center]"
        />
      </figure>
    </div>
  </section>
)
