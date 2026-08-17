import { contact } from '@/lib/constants/contact'

/**
 * Ce que l'écran de confirmation annonce au sujet de l'e-mail.
 *
 * L'envoi est mis en file après la réponse, donc l'écran ne peut pas savoir
 * s'il a abouti : il annonce un départ, jamais une réception. Et quand aucun
 * envoi n'est configuré, il n'en dit rien plutôt que d'annoncer une absence —
 * le rendez-vous est enregistré dans les deux cas, c'est cela qui compte.
 */
export interface ConfirmationDeliveryNotice {
  title: string
  detail: string
}

export const describeConfirmationDelivery = (
  recipient: string | null | undefined,
): ConfirmationDeliveryNotice | null => {
  const address = recipient?.trim()
  if (!address) return null

  return {
    title: `Le détail part par e-mail à ${address}`,
    detail: `Il arrive d’ici quelques minutes. Si cette adresse comporte une faute, appelez-nous au ${contact.phone} : votre rendez-vous, lui, est bien enregistré.`,
  }
}
