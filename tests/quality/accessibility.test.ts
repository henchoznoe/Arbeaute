import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAIN_CONTENT_ID } from '@/components/ui/skip-link'

/**
 * `goToStep` ne faisait que défiler : le bouton pressé devenait `disabled` ou
 * disparaissait avec l'étape, et le focus retombait sur `<body>`. Quelqu'un qui
 * navigue au clavier ou à la voix traversait le tunnel dans le silence et
 * repartait du haut de la page à chaque fois — les deux écrans terminaux
 * compris, c'est-à-dire au moment le plus important du parcours.
 */
const WIZARD = readFileSync(
  'components/reservation/reservation-wizard.tsx',
  'utf8',
)
const LAYOUT = readFileSync('app/layout.tsx', 'utf8')

describe('tunnel annoncé et navigable au clavier', () => {
  it('pose le focus sur le titre de l’étape atteinte', () => {
    // Sept titres portent le ref : les quatre étapes — celle des coordonnées
    // se jouant en deux écrans — et les deux écrans terminaux. Un seul est
    // monté à la fois.
    expect(WIZARD.match(/ref=\{stepHeadingRef\}/g)).toHaveLength(7)
    expect(WIZARD).toContain('stepHeadingRef.current?.focus()')
    // Le repère qui déclenche la reprise du focus, écrit tel quel.
    expect(WIZARD).toMatch(
      /const stepFocusKey = `\$\{step\}:\$\{detailsStage\}:\$\{confirmed\}:\$\{requested\}`/,
    )
  })

  it('ne vole pas le focus au premier rendu', () => {
    // Le repère part de l'étape affichée : rien ne bouge tant qu'elle ne
    // change pas.
    expect(WIZARD).toContain('const focusedStepRef = useRef(stepFocusKey)')
  })

  it('nomme l’étape en cours dans une région annoncée', () => {
    expect(WIZARD).toContain('role="status" aria-live="polite"')
    expect(WIZARD).toContain('Étape {step} sur {STEP_LABELS.length}')
  })

  it('annonce les deux écrans terminaux', () => {
    expect(WIZARD).toContain(
      'Demande transmise. Ce n’est pas encore un rendez-vous.',
    )
    expect(WIZARD).toContain('Votre rendez-vous est confirmé.')
  })
})

describe('coquille du site', () => {
  it('déclare la langue réellement employée', () => {
    // `siteConfig.language` et tout le formatage `Intl` sont en fr-CH.
    expect(LAYOUT).toContain('lang="fr-CH"')
    expect(LAYOUT).not.toContain('lang="fr"')
  })

  it('pose un lien d’évitement avant le contenu', () => {
    expect(LAYOUT).toContain('<SkipLink />')
  })

  it('donne à chaque <main> la cible du lien d’évitement', () => {
    const listSourceFiles = (directory: string): string[] =>
      readdirSync(directory, { recursive: true, encoding: 'utf8' })
        .filter(entry => entry.endsWith('.tsx'))
        .map(entry => join(directory, entry))

    const offenders = ['app', 'components']
      .flatMap(listSourceFiles)
      .flatMap(file => {
        const source = readFileSync(file, 'utf8')
        const opened = source.match(/<main[\s>]/g)?.length ?? 0
        const identified = source.match(/id=\{MAIN_CONTENT_ID\}/g)?.length ?? 0
        return opened > identified
          ? [`${file} (${opened} > ${identified})`]
          : []
      })

    expect(offenders).toEqual([])
    expect(MAIN_CONTENT_ID).toBe('contenu')
  })
})
