import { Compass } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ErrorScreen } from '@/components/ui/error-screen'

/** Un identifiant inconnu : le rendez-vous ou la fiche a pu être supprimé. */
const AdminNotFound = () => (
  <ErrorScreen
    icon={Compass}
    eyebrow="Administration"
    title="Cette page n’existe plus"
    description="Le rendez-vous, le client ou la prestation que vous cherchiez a peut-être été supprimé. Repartez de l’agenda, ou cherchez-le par son nom."
    actions={
      <>
        <Button asChild>
          <Link href="/admin">Revenir à l’agenda</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/search">Chercher</Link>
        </Button>
      </>
    }
  />
)

export default AdminNotFound
