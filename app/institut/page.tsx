import { GraduationCap, MapPin, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/public-shell'
import { Button } from '@/components/ui/button'
import { institutePlaceholders } from '@/lib/config/placeholders'
import { createPageMetadata } from '@/lib/config/seo'
import { bio, contact } from '@/lib/constants/contact'

export const metadata = createPageMetadata({
  title: 'L’institut',
  description:
    'Arzu Yurdakul vous reçoit seule, sur rendez-vous, dans son institut au cœur de Bulle. Une praticienne, un soin à la fois.',
  path: '/institut',
})

const commitments = [
  {
    icon: Sparkles,
    title: 'Une seule praticienne',
    body: 'Arzu vous reçoit du premier conseil au dernier geste. Personne ne reprend le soin en cours de route, et personne ne travaille sur deux personnes à la fois.',
  },
  {
    icon: GraduationCap,
    title: 'Des formations qui continuent',
    body: 'Laser Erbium, endosphères, microblading : chaque appareil et chaque technique demandent une formation, et elles se renouvellent. C’est ce qui permet de dire aussi quand un soin n’est pas indiqué.',
  },
  {
    icon: MapPin,
    title: 'Au cœur de Bulle',
    body: 'À deux pas de la place du marché, dans un institut indépendant. Uniquement sur rendez-vous : aucune visite à l’improviste n’est possible.',
  },
]

const InstitutePage = () => (
  <PublicShell>
    <section className="px-6 pt-28 pb-16 sm:pt-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
            L’institut
          </p>
          <h1 className="mt-3 font-heading text-display font-semibold">
            Un lieu, une praticienne, un soin à la fois.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {contact.name} est l’institut d’{contact.owner}, à Bulle. Tout s’y
            passe sur rendez-vous, dans un créneau réservé à une seule personne
            — le vôtre.
          </p>
          <div data-primary-booking-cta className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 rounded-full px-8">
              <Link href={contact.bookingUrl}>Prendre rendez-vous</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-full px-8"
            >
              <Link href="/prestations">Voir les prestations</Link>
            </Button>
          </div>
        </div>

        <figure className="overflow-hidden rounded-3xl bg-muted shadow-sm">
          <Image
            src="/arzu.jpeg"
            alt={contact.owner}
            width={1080}
            height={1350}
            sizes="(min-width: 1024px) 40vw, 100vw"
            priority
            className="aspect-4/5 w-full object-cover object-top"
          />
          <figcaption className="px-5 py-4 text-sm text-muted-foreground">
            {contact.owner}, esthéticienne diplômée.
          </figcaption>
        </figure>
      </div>
    </section>

    <section className="bg-muted/35 px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <blockquote className="reveal-on-scroll font-heading text-2xl leading-relaxed text-foreground italic sm:text-3xl">
          « {bio} »
        </blockquote>
        <p className="mt-6 text-sm font-semibold tracking-widest text-brand uppercase">
          {contact.owner}
        </p>
      </div>
    </section>

    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-2xl font-heading text-title font-semibold">
          Ce sur quoi vous pouvez compter
        </h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {commitments.map(item => {
            const Icon = item.icon
            return (
              <article key={item.title} className="reveal-on-scroll">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-subtle text-brand-strong">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-heading text-xl font-semibold">
                  {item.title}
                </h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>

    <section className="px-6 pb-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-heading text-title font-semibold">
          L’institut en images
        </h2>
        {/* Photos d'attente : elles partent avec `lib/config/placeholders.ts`
            dès que celles de l'institut arrivent. */}
        <p className="mt-3 max-w-xl text-muted-foreground">
          Les photos de l’institut arrivent bientôt ; celles-ci en donnent
          l’atmosphère.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {institutePlaceholders.map((image, index) => (
            <figure
              key={image.src}
              className={`overflow-hidden rounded-3xl bg-muted ${
                index === 1 ? 'sm:mt-12' : ''
              }`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={1200}
                height={1500}
                sizes="(min-width: 640px) 31vw, 100vw"
                unoptimized
                className="drift-on-scroll aspect-4/5 w-full object-cover"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  </PublicShell>
)

export default InstitutePage
