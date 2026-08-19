import { WifiOff } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MAIN_CONTENT_ID } from '@/components/ui/skip-link'
import { contact } from '@/lib/constants/contact'

export const metadata: Metadata = {
  title: 'Hors ligne',
  robots: { index: false, follow: false },
}

/** Page de repli mise en cache par `public/sw.js` quand le réseau manque. */
const OfflinePage = () => (
  <main
    id={MAIN_CONTENT_ID}
    className="flex min-h-screen items-center justify-center px-6 py-16"
  >
    <section className="w-full max-w-sm text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-subtle text-brand">
        <WifiOff className="size-6" />
      </div>

      <h1 className="mt-6 font-heading text-2xl font-bold">Pas de connexion</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Cette page n’a pas pu être chargée. Vérifiez votre connexion internet,
        puis réessayez.
      </p>

      <Button asChild className="mt-8">
        <Link href="/">Réessayer</Link>
      </Button>

      <p className="mt-6 text-xs text-muted-foreground">
        Besoin de nous joindre ?{' '}
        <a
          href={`tel:${contact.phoneRaw}`}
          className="underline underline-offset-2"
        >
          {contact.phone}
        </a>
      </p>
    </section>
  </main>
)

export default OfflinePage
