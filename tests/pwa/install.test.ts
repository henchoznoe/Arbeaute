import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { invitesInstall } from '@/lib/pwa/install'

/**
 * La bannière choisissait sa variante selon le chemin mais ne se demandait
 * jamais si le moment était bon : elle s'ouvrait au milieu de `/reservation`,
 * recouvrant la liste des prestations pendant le choix, et sur `/admin/login`,
 * c'est-à-dire avant même que quiconque soit identifié.
 */
describe('moment d’une proposition d’installation', () => {
  it.each(['/'])('s’invite sur %s', pathname => {
    expect(invitesInstall(pathname)).toBe(true)
  })

  it.each([
    '/reservation',
    '/reservation?service=soin-eclat',
    '/mes-rendez-vous',
    '/admin/login',
    '/conditions-generales',
  ])('ne s’invite pas sur %s', pathname => {
    expect(invitesInstall(pathname)).toBe(false)
  })

  it.each(['/admin', '/admin/demandes', '/admin/services'])(
    'reste proposée sur l’écran authentifié %s',
    pathname => {
      expect(invitesInstall(pathname)).toBe(true)
    },
  )
})

describe('bannière d’installation', () => {
  const PROMPT = readFileSync('components/pwa/install-prompt.tsx', 'utf8')
  const FOOTER = readFileSync('components/sections/footer.tsx', 'utf8')

  it('n’écoute l’ouverture spontanée que là où elle est permise', () => {
    expect(PROMPT).toContain('if (invited) {')
    // La demande explicite, elle, passe partout.
    expect(PROMPT).toContain(
      'window.addEventListener(SHOW_INSTALL_EVENT, showNow)',
    )
  })

  it('laisse la proposition atteignable depuis le pied de page', () => {
    expect(FOOTER).toContain('<InstallAppButton')
  })

  it('ne touche ni au délai ni à la mémoire du refus', () => {
    expect(PROMPT).toContain('target.delayMs')
    expect(PROMPT).toContain(
      'isSilenced(target.dismissKey, target.dismissDays)',
    )
    expect(PROMPT).toContain('rememberDismissal(target.dismissKey)')
  })
})
