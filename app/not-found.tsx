import { Compass } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ErrorScreen } from '@/components/ui/error-screen'

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: false },
}

/** Une adresse qui ne mène à rien : on nomme les deux pages qui servent. */
const PublicNotFound = () => (
  <ErrorScreen
    icon={Compass}
    eyebrow="Arbeauté"
    title="Cette page n’existe pas"
    description="L’adresse est peut-être ancienne, ou mal recopiée. Reprenez depuis l’accueil, ou allez directement à la réservation."
    actions={
      <>
        <Button asChild>
          <Link href="/reservation">Prendre rendez-vous</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Retour à l’accueil</Link>
        </Button>
      </>
    }
  />
)

export default PublicNotFound
