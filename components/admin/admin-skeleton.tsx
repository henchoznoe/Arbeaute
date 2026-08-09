import { LoaderCircle } from 'lucide-react'

/**
 * Coquille des pages d'administration.
 *
 * Sert à la fois de `loading.tsx` et de `fallback` des `<Suspense>` internes.
 * Les deux sont nécessaires : `loading.tsx` ne couvre que l'arrivée directe sur
 * l'URL, alors qu'une navigation client depuis le site public ne le traverse
 * pas — sans limite explicite dans la page, la lecture des cookies bloquerait
 * la transition.
 */
export const AdminSkeleton = ({
  maxWidth = 'max-w-7xl',
}: Readonly<{ maxWidth?: string }>) => (
  <main className={`mx-auto min-h-screen ${maxWidth} px-4 py-6 sm:px-8`}>
    <div className="flex items-center gap-3 text-muted-foreground">
      <LoaderCircle className="size-5 animate-spin" />
      <p className="text-sm font-medium">Chargement…</p>
    </div>

    <div className="mt-8 space-y-4" aria-hidden="true">
      <div className="h-10 w-56 animate-pulse rounded-xl bg-muted" />
      <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      <div className="h-28 animate-pulse rounded-2xl bg-muted" />
    </div>
  </main>
)

/** Variante centrée, pour la page de connexion. */
export const AdminCardSkeleton = () => (
  <main className="flex min-h-screen items-center justify-center px-6 py-16">
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <LoaderCircle className="size-6 animate-spin" />
      <p className="text-sm font-medium">Chargement…</p>
    </div>
  </main>
)
