import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { describeExportFailure } from '@/lib/admin/data-management'

/**
 * Il n'existait aucun `error.tsx` ni `not-found.tsx` dans le projet : une
 * action serveur qui levait, ou un `notFound()` sur un identifiant inconnu,
 * renvoyaient l'écran par défaut de Next — en anglais, sans la charte, sans
 * chemin de retour, et sans rien dire de ce qu'il faut faire. Les
 * téléchargements, eux, répondaient par du texte brut.
 */
const SCREENS = [
  'app/error.tsx',
  'app/not-found.tsx',
  'app/admin/error.tsx',
  'app/admin/not-found.tsx',
]

describe('écrans d’erreur', () => {
  it.each(SCREENS)('%s existe', screen => {
    expect(existsSync(screen)).toBe(true)
  })

  it.each(SCREENS)('%s passe par la charte commune', screen => {
    const source = readFileSync(screen, 'utf8')
    expect(source).toContain("from '@/components/ui/error-screen'")
    expect(source).toContain('<ErrorScreen')
  })

  it('offre un retour vers l’agenda depuis l’administration', () => {
    for (const screen of ['app/admin/error.tsx', 'app/admin/not-found.tsx']) {
      const source = readFileSync(screen, 'utf8')
      expect(source, screen).toContain('href="/admin"')
    }
  })

  it('permet de repartir depuis le site public', () => {
    for (const screen of ['app/error.tsx', 'app/not-found.tsx']) {
      const source = readFileSync(screen, 'utf8')
      expect(source, screen).toContain('href="/"')
    }
  })

  it('écrit en français, et jamais en anglais', () => {
    for (const screen of SCREENS) {
      const source = readFileSync(screen, 'utf8')
      expect(source, screen).not.toMatch(
        /\b(Something went wrong|Try again|Not Found|Page not found)\b/,
      )
    }
  })
})

describe('téléchargement qui n’aboutit pas', () => {
  it('ne répond plus par du texte brut', () => {
    const route = readFileSync('app/admin/data/export/[type]/route.ts', 'utf8')
    expect(route).not.toContain("new Response('Période invalide'")
    expect(route).not.toContain("new Response('Export introuvable'")
    expect(route).toContain('backToData(request,')
  })

  it.each([
    ['periode', 'date de début'],
    ['statut', 'liste'],
    ['introuvable', 'trois boutons'],
    ['impossible', 'prévenez Noé'],
  ])('dit ce qui s’est passé puis quoi faire pour %s', (reason, hint) => {
    const message = describeExportFailure(reason)
    expect(message).toBeTruthy()
    expect(message).toContain(hint)
  })

  it('ne dit rien quand rien n’a échoué', () => {
    expect(describeExportFailure(undefined)).toBeNull()
  })
})
