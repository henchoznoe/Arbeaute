import { describe, expect, it } from 'vitest'
import { describeEmailError } from '@/lib/admin/emails'

/**
 * Le message brut du fournisseur est du JSON anglais. Arzu ne doit jamais le
 * lire en première ligne : chaque cas connu reçoit une phrase qui dit quoi
 * faire ensuite, conformément à `docs/vocabulaire.md`.
 */
describe('describeEmailError', () => {
  it('ne dit rien quand il n’y a pas d’erreur', () => {
    expect(describeEmailError(null)).toBeNull()
  })

  it('explique le refus de destinataire pendant la vérification du domaine', () => {
    const phrase = describeEmailError(
      'Resend a répondu 422. {"statusCode":422,"name":"validation_error","message":"Invalid `to` field."}',
    )
    expect(phrase).toContain('domaine n’est pas vérifié')
    expect(phrase).toContain('renvoyez')
    expect(phrase).not.toContain('statusCode')
  })

  it('oriente vers la clé quand elle est refusée', () => {
    expect(describeEmailError('Resend a répondu 401. Unauthorized')).toContain(
      'clé Resend',
    )
  })

  it('demande d’attendre quand le rythme est trop élevé', () => {
    expect(describeEmailError('Resend a répondu 429.')).toContain(
      'quelques minutes',
    )
  })

  it('reconnaît le dépassement de délai et la panne du fournisseur', () => {
    expect(
      describeEmailError('Resend n’a pas répondu dans les dix secondes.'),
    ).toContain('pas répondu à temps')
    expect(describeEmailError('Resend a répondu 503.')).toContain('panne')
  })

  it('reconnaît la limite gratuite', () => {
    expect(
      describeEmailError(
        'Limite de l’offre gratuite atteinte : l’envoi n’a pas été tenté.',
      ),
    ).toContain('limite gratuite')
  })

  it('retombe sur une consigne utile pour l’inconnu', () => {
    const phrase = describeEmailError('quelque chose d’inattendu')
    expect(phrase).toContain('Réessayez')
    expect(phrase).toContain('prévenez Noé')
  })
})
