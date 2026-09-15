import { CalendarDays, Check } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { buildPackageReservationPath } from '@/lib/packages/deep-link'
import { getPublicPackages } from '@/lib/packages/queries'
import { formatPrice } from '@/lib/utils/format'

export const PackagesShowcase = async ({
  compact = false,
}: Readonly<{ compact?: boolean }>) => {
  const packages = await getPublicPackages()
  if (packages.length === 0)
    return compact ? null : (
      <section className="bg-brand-subtle/35 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border bg-card p-6 text-center sm:p-10">
          <h2 className="font-heading text-2xl font-semibold">
            Les forfaits arrivent bientôt
          </h2>
          <p className="mt-3 text-muted-foreground">
            Les prestations restent disponibles à la réservation pendant leur
            préparation.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link href="/reservation">Réserver une prestation</Link>
          </Button>
        </div>
      </section>
    )
  const visible = compact ? packages.slice(0, 2) : packages
  return (
    <section className="bg-brand-subtle/35 px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
              Nos forfaits
            </p>
            <h2 className="mt-3 max-w-2xl font-heading text-title font-semibold">
              Un parcours complet, à un prix défini dès le départ.
            </h2>
          </div>
          {compact ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/forfaits">Voir tous les forfaits</Link>
            </Button>
          ) : null}
        </div>
        <div className="mt-10 grid gap-7 lg:grid-cols-2">
          {visible.map(item => (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border bg-card shadow-sm"
            >
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={`Affiche du ${item.name}`}
                  width={1408}
                  height={768}
                  sizes="(min-width: 1024px) 48vw, 100vw"
                  className="h-auto w-full"
                />
              ) : null}
              <div className="p-6 sm:p-8">
                <h3 className="font-heading text-2xl font-semibold">
                  {item.name}
                </h3>
                {item.description ? (
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
                <p className="mt-5 font-heading text-3xl font-semibold text-price">
                  {formatPrice(item.priceCents)}
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    {item.sessionCount} séances
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    Valable {item.validityMonths} mois dès le premier
                    rendez-vous
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    Paiement sur place en 1, 2 ou 3 fois
                  </li>
                </ul>
                <Button asChild size="lg" className="mt-7 w-full rounded-full">
                  <Link href={buildPackageReservationPath(item.slug)}>
                    <CalendarDays className="size-5" />
                    Réserver ce forfait
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
