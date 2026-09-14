import { PublicShell } from '@/components/layout/public-shell'
import { PackagesShowcase } from '@/components/sections/packages-showcase'
import { createPageMetadata } from '@/lib/config/seo'

export const metadata = createPageMetadata({
  title: 'Forfaits de soins',
  description:
    'Découvrez les forfaits de plusieurs séances proposés par Arbeauté à Bulle, réservables en ligne et payables sur place.',
  path: '/forfaits',
})

const PackagesPage = () => (
  <PublicShell>
    <section className="px-6 pt-28 pb-12 sm:pt-32">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
          Plusieurs séances
        </p>
        <h1 className="mt-3 max-w-3xl font-heading text-display font-semibold">
          Choisissez votre forfait, puis votre premier rendez-vous.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Les séances suivantes seront planifiées avec Arzu. Le paiement
          s’effectue à l’institut, en une, deux ou trois fois selon votre choix.
        </p>
      </div>
    </section>
    <PackagesShowcase />
  </PublicShell>
)

export default PackagesPage
