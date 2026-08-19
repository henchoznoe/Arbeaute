'use client'

import { TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ErrorScreen } from '@/components/ui/error-screen'
import { contact } from '@/lib/constants/contact'

/**
 * Ce que voit quelqu'un quand une page publique échoue.
 *
 * Avant, c'était l'écran par défaut de Next : en anglais, sans la charte, et
 * sans dire quoi faire. Ici, le geste qui reste est nommé — réessayer, ou
 * appeler l'institut, parce qu'une réservation qui échoue se règle au
 * téléphone en une minute.
 */
const PublicError = ({ reset }: Readonly<{ reset: () => void }>) => (
  <ErrorScreen
    icon={TriangleAlert}
    eyebrow="Arbeauté"
    title="Cette page n’a pas pu s’afficher"
    description="Quelque chose s’est mal passé de notre côté. Réessayez : si l’écran revient, appelez-nous, nous prenons votre rendez-vous au téléphone."
    actions={
      <>
        <Button type="button" onClick={reset}>
          Réessayer
        </Button>
        <Button asChild variant="outline">
          <a href={`tel:${contact.phoneRaw}`}>Appeler le {contact.phone}</a>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Retour à l’accueil</Link>
        </Button>
      </>
    }
  />
)

export default PublicError
