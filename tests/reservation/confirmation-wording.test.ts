import { describe, expect, it } from 'vitest'
import { contact } from '@/lib/constants/contact'
import { describeConfirmationDelivery } from '@/lib/reservation/confirmation-wording'

/**
 * L'écran de confirmation doit rassurer, jamais avertir. Deux règles s'y
 * jouent : rappeler l'adresse pour qu'une faute de saisie saute aux yeux, et
 * ne rien annoncer du tout quand aucun envoi n'est configuré.
 */
describe('describeConfirmationDelivery', () => {
  it('rappelle l’adresse de destination', () => {
    const notice = describeConfirmationDelivery('claire@example.ch')
    expect(notice?.title).toContain('claire@example.ch')
  })

  it('dit quoi faire en cas de faute de saisie, sans inquiéter', () => {
    const notice = describeConfirmationDelivery('claire@example.ch')
    expect(notice?.detail).toContain(contact.phone)
    expect(notice?.detail).toContain('bien enregistré')
  })

  it('n’annonce rien quand aucun envoi n’a lieu', () => {
    expect(describeConfirmationDelivery(null)).toBeNull()
    expect(describeConfirmationDelivery(undefined)).toBeNull()
    expect(describeConfirmationDelivery('   ')).toBeNull()
  })

  it('ne formule jamais l’absence d’e-mail comme un manque', () => {
    const notice = describeConfirmationDelivery('claire@example.ch')
    const wording = `${notice?.title} ${notice?.detail}`.toLowerCase()
    expect(wording).not.toContain('aucun')
    expect(wording).not.toContain('ne sera pas')
  })
})
