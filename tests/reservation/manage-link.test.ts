import { describe, expect, it } from 'vitest'
import {
  buildManageUrl,
  MANAGE_PATH,
  MANAGE_SIGN_IN_PATH,
} from '@/lib/reservation/manage-link'

const base = 'https://www.arbeaute-bulle.ch'

describe('buildManageUrl', () => {
  it('porte l’adresse pour ouvrir la session sans ressaisie', () => {
    const url = new URL(buildManageUrl(base, 'marie@example.com'))

    expect(url.pathname).toBe(MANAGE_SIGN_IN_PATH)
    expect(url.searchParams.get('email')).toBe('marie@example.com')
  })

  it('encode ce qui doit l’être', () => {
    // Un « + » non encodé serait relu comme une espace, et l'adresse ne
    // correspondrait à aucune fiche.
    expect(buildManageUrl(base, 'marie+institut@example.com')).toContain(
      'email=marie%2Binstitut%40example.com',
    )
  })

  it('retombe sur l’écran d’identification sans adresse', () => {
    // L'effacement des coordonnées écrit NULL, et les rendez-vous anciens n'ont
    // parfois jamais eu d'adresse : le lien doit rester valide.
    expect(buildManageUrl(base, null)).toBe(`${base}${MANAGE_PATH}`)
    expect(buildManageUrl(base, '   ')).toBe(`${base}${MANAGE_PATH}`)
    expect(buildManageUrl(base)).toBe(`${base}${MANAGE_PATH}`)
  })
})
