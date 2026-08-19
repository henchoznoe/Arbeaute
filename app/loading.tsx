import { Skeleton } from '@/components/ui/skeleton'
import { MAIN_CONTENT_ID } from '@/components/ui/skip-link'

/**
 * Coquille du site public. Elle reprend la composition du premier écran — barre
 * de navigation, sur-titre, grand titre, deux actions, photo — pour que rien ne
 * saute quand le contenu arrive.
 */
const PublicLoading = () => (
  <>
    <div className="fixed inset-x-0 top-0 z-50 h-16 border-b border-foreground/10 bg-background/70 backdrop-blur-lg">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-9 w-36 rounded-full" />
      </div>
    </div>
    <main
      id={MAIN_CONTENT_ID}
      className="min-h-screen bg-linear-to-br from-brand-subtle via-warning-subtle/70 to-warning-subtle/40 px-5 pt-24 pb-12 sm:px-8"
    >
      <p role="status" className="sr-only">
        Chargement…
      </p>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-14 rounded-full md:hidden" />
            <Skeleton className="h-4 w-48 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full max-w-md" />
          <Skeleton className="h-12 w-3/4 max-w-sm" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-4 w-2/3 max-w-md" />
          <div className="flex flex-wrap gap-3 pt-2">
            <Skeleton className="h-12 w-48 rounded-lg" />
            <Skeleton className="h-12 w-40 rounded-lg" />
          </div>
        </div>
        <Skeleton className="hidden aspect-4/5 w-full rounded-3xl md:block" />
      </div>
    </main>
  </>
)

export default PublicLoading
