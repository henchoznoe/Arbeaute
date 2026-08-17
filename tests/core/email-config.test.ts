import { describe, expect, it } from 'vitest'
import { looksLikeEmailAddress } from '@/lib/core/env'

/**
 * Garde-fou né d'une vraie panne : `RESEND_FROM` était validé par `z.email()`,
 * qui refuse la forme « Nom <adresse> » — celle qu'attend Resend et celle
 * documentée dans `.env.example`. L'erreur remontait à l'import de `env.ts` et
 * renvoyait 500 sur toutes les pages du site.
 *
 * Une adresse d'expéditeur mal formée doit désactiver les e-mails, jamais
 * empêcher une cliente de réserver.
 */
describe('looksLikeEmailAddress', () => {
  it('accepte la forme « Nom <adresse> » attendue par Resend', () => {
    expect(
      looksLikeEmailAddress('Arbeauté <rendez-vous@arbeaute-bulle.ch>'),
    ).toBe(true)
  })

  it('accepte une adresse nue', () => {
    expect(looksLikeEmailAddress('rendez-vous@arbeaute-bulle.ch')).toBe(true)
  })

  it('tolère les espaces autour de l’adresse', () => {
    expect(looksLikeEmailAddress('  contact@example.ch  ')).toBe(true)
    expect(looksLikeEmailAddress('Nom < contact@example.ch >')).toBe(true)
  })

  it('rejette ce qui n’est pas une adresse', () => {
    expect(looksLikeEmailAddress('pas-une-adresse')).toBe(false)
    expect(looksLikeEmailAddress('Nom <cassé>')).toBe(false)
    expect(looksLikeEmailAddress('a@b')).toBe(false)
  })

  it('traite l’absence de valeur comme non configuré', () => {
    expect(looksLikeEmailAddress(undefined)).toBe(false)
    expect(looksLikeEmailAddress('')).toBe(false)
  })
})
