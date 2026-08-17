import type { ReactNode } from 'react'
import { Skeleton, skeletonKeys } from '@/components/ui/skeleton'

/**
 * Coquilles des pages d'administration.
 *
 * Elles servent à la fois de `loading.tsx` et de `fallback` des `<Suspense>`
 * internes. Les deux sont nécessaires : `loading.tsx` ne couvre que l'arrivée
 * directe sur l'URL, alors qu'une navigation client depuis le site public ne le
 * traverse pas — sans limite explicite dans la page, la lecture des cookies
 * bloquerait la transition.
 *
 * Chaque variante reprend la forme de l'écran qu'elle remplace : une coquille
 * qui ne ressemble pas à la page fait sauter la mise en page au moment où le
 * contenu arrive.
 */
type AdminSkeletonVariant = 'agenda' | 'form' | 'list' | 'cards' | 'card'

const PageHeading = () => (
  <div className="space-y-3">
    <Skeleton className="h-4 w-28 rounded-full" />
    <Skeleton className="h-9 w-52" />
    <Skeleton className="h-4 w-full max-w-md" />
  </div>
)

const AgendaShape = () => (
  <>
    <Skeleton className="h-8 w-32" />
    <Skeleton className="mt-4 h-28 rounded-2xl" />

    <div className="mt-4 rounded-2xl border p-3 md:hidden">
      <Skeleton className="h-4 w-40 rounded-full" />
      <div className="mt-3 grid grid-cols-7 gap-1">
        {skeletonKeys(7).map(key => (
          <Skeleton key={key} className="h-14" />
        ))}
      </div>
    </div>
    <div className="mt-4 space-y-3 md:hidden">
      {skeletonKeys(3).map(key => (
        <Skeleton key={key} className="h-24" />
      ))}
    </div>

    <div className="mt-7 hidden gap-2 md:grid md:grid-cols-7">
      {skeletonKeys(7).map(key => (
        <Skeleton key={key} className="h-96 rounded-2xl" />
      ))}
    </div>

    <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
      {skeletonKeys(4).map(key => (
        <Skeleton key={key} className="h-24 rounded-2xl" />
      ))}
    </div>
  </>
)

const FormShape = () => (
  <>
    <Skeleton className="h-8 w-28" />
    <Skeleton className="mt-3 h-9 w-64" />
    <Skeleton className="mt-3 h-4 w-full max-w-lg" />
    <div className="mt-7 space-y-5 rounded-3xl border p-5 sm:p-7">
      {skeletonKeys(5).map(key => (
        <div key={key} className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-11" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-11" />
          </div>
        </div>
      ))}
      <Skeleton className="h-11 w-full rounded-lg sm:w-52" />
    </div>
  </>
)

const ListShape = () => (
  <>
    <PageHeading />
    <Skeleton className="mt-6 h-12 rounded-2xl" />
    <div className="mt-4 space-y-2">
      {skeletonKeys(6).map(key => (
        <Skeleton key={key} className="h-20" />
      ))}
    </div>
  </>
)

const CardsShape = () => (
  <>
    <PageHeading />
    <div className="mt-7 grid gap-4 sm:grid-cols-2">
      {skeletonKeys(4).map(key => (
        <Skeleton key={key} className="h-56 rounded-3xl" />
      ))}
    </div>
  </>
)

const shapes: Record<Exclude<AdminSkeletonVariant, 'card'>, () => ReactNode> = {
  agenda: AgendaShape,
  form: FormShape,
  list: ListShape,
  cards: CardsShape,
}

export const AdminSkeleton = ({
  variant = 'list',
  maxWidth = 'max-w-7xl',
}: Readonly<{ variant?: AdminSkeletonVariant; maxWidth?: string }>) => {
  if (variant === 'card')
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <p role="status" className="sr-only">
          Chargement…
        </p>
        <Skeleton className="h-96 w-full max-w-sm rounded-3xl" />
      </main>
    )

  const Shape = shapes[variant]
  return (
    <main className={`mx-auto min-h-screen ${maxWidth} px-4 py-6 sm:px-8`}>
      <p role="status" className="sr-only">
        Chargement…
      </p>
      <Shape />
    </main>
  )
}
