import { describe, expect, it } from 'vitest'
import { describeEmailError, isResendableKind } from '@/lib/admin/emails'

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

  /**
   * Cas observé en conditions réelles : Resend répond 403 tant que le domaine
   * n'est pas vérifié. Envoyer Arzu vérifier sa clé serait une fausse piste.
   */
  it('distingue le domaine non vérifié d’une clé refusée', () => {
    const phrase = describeEmailError(
      'Resend a répondu 403. {"statusCode":403,"message":"The arbeaute-bulle.ch domain is not verified."}',
    )
    expect(phrase).toContain('domaine')
    expect(phrase).not.toContain('clé Resend')
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

describe('isResendableKind', () => {
  it('accepte les trois messages déclenchés par une réservation', () => {
    expect(isResendableKind('BOOKING_CONFIRMATION')).toBe(true)
    expect(isResendableKind('BOOKING_RESCHEDULED')).toBe(true)
    expect(isResendableKind('BOOKING_CANCELLED')).toBe(true)
  })

  it('refuse ce dont plus aucun gabarit ne peut reconstruire le corps', () => {
    // Le rappel de la veille et le récapitulatif quotidien ont été supprimés.
    // Leurs valeurs restent dans l'énumération pour que l'historique se lise,
    // mais rien ne peut plus les réécrire.
    expect(isResendableKind('APPOINTMENT_REMINDER')).toBe(false)
    expect(isResendableKind('DAILY_DIGEST')).toBe(false)
  })
})
