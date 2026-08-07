import { LoaderCircle } from 'lucide-react'

const PublicLoading = () => (
  <main className="flex min-h-screen items-center justify-center px-5">
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <LoaderCircle className="size-6 animate-spin" />
      <p className="text-sm font-medium">Chargement…</p>
    </div>
  </main>
)

export default PublicLoading
