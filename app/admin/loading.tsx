import { LoaderCircle } from 'lucide-react'

const AdminLoading = () => (
  <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-8">
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

export default AdminLoading
