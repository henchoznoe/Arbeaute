'use client'

import { TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ErrorScreen } from '@/components/ui/error-screen'
import { contact } from '@/lib/constants/contact'

/**
 * Ce que voit Arzu quand une action de l'administration lève.
 *
 * Une analyse de formulaire ratée renvoyait l'écran par défaut de Next : en
 * anglais, sans la charte, sans retour vers l'agenda. Ici le retour est nommé,
 * et la consigne dit ce qui a été enregistré — rien.
 */
const AdminError = ({ reset }: Readonly<{ reset: () => void }>) => (
  <ErrorScreen
    icon={TriangleAlert}
    eyebrow="Administration"
    title="Cette action n’a pas abouti"
    description="Rien n’a été enregistré. Réessayez : si l’écran revient, prévenez Noé en lui disant ce que vous étiez en train de faire."
    actions={
      <>
        <Button type="button" onClick={reset}>
          Réessayer
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin">Revenir à l’agenda</Link>
        </Button>
        <Button asChild variant="ghost">
          <a href={`mailto:${contact.email}`}>Écrire à l’institut</a>
        </Button>
      </>
    }
  />
)

export default AdminError
