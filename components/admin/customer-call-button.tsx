import { Phone, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

/**
 * Appeler une cliente en un seul appui.
 *
 * Le numéro était auparavant affiché en texte brut : il fallait le
 * sélectionner, le copier, ouvrir le téléphone et le coller. Quand aucun
 * numéro n'est enregistré, l'absence est dite explicitement plutôt que de
 * laisser une action inerte que rien ne distingue d'une action disponible.
 */
export const CustomerCallButton = ({
  phone,
  customerName,
  className,
  variant = 'outline',
}: Readonly<{
  phone: string | null
  customerName: string
  className?: string
  variant?: 'outline' | 'secondary'
}>) => {
  if (!phone)
    return (
      <p
        className={cn(
          'inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground',
          className,
        )}
      >
        <PhoneOff className="size-4 shrink-0" aria-hidden="true" />
        Pas de numéro enregistré
      </p>
    )

  return (
    <Button asChild variant={variant} className={className}>
      <a href={`tel:${phone.replace(/\s/g, '')}`}>
        <Phone className="size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">Appeler {customerName} au </span>
        {phone}
      </a>
    </Button>
  )
}
