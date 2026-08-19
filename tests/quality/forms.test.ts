import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Un `<form>` sans `action` ni `method` se soumet en `GET` vers l'URL courante.
 *
 * Tant que React n'a pas hydraté la page, `onSubmit` n'est attaché à rien : le
 * navigateur fait donc ce qu'il sait faire, et écrit les champs dans l'URL.
 * L'étape « votre adresse e-mail » du tunnel envoyait ainsi l'adresse et le pot
 * de miel dans la barre d'adresse, l'historique et le `Referer` — sur un
 * téléphone de milieu de gamme, la fenêtre entre l'affichage et l'hydratation
 * n'a rien de théorique.
 *
 * La règle vaut pour tous les formulaires pilotés en JavaScript, pas seulement
 * pour celui du tunnel : un `action` de Server Action, ou `method="post"`.
 */
const SCANNED_DIRECTORIES = ['app', 'components']

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter(entry => entry.endsWith('.tsx'))
    .map(entry => join(directory, entry))

/**
 * Isole la balise ouvrante de chaque `<form>`. Le suivi des accolades évite de
 * s'arrêter sur le `>` d'une fonction fléchée passée en attribut.
 */
const listFormOpeningTags = (source: string): string[] => {
  const tags: string[] = []
  const pattern = /<form(?=[\s>])/g
  let match = pattern.exec(source)

  while (match) {
    let depth = 0
    let index = match.index + '<form'.length
    while (index < source.length) {
      const character = source[index]
      if (character === '{') depth += 1
      else if (character === '}') depth -= 1
      else if (character === '>' && depth === 0) break
      index += 1
    }
    tags.push(source.slice(match.index, index + 1))
    match = pattern.exec(source)
  }

  return tags
}

describe('formulaires sans soumission native', () => {
  it('n’envoie jamais un formulaire piloté en JavaScript dans l’URL', () => {
    const offenders = SCANNED_DIRECTORIES.flatMap(listSourceFiles).flatMap(
      file => {
        const source = readFileSync(file, 'utf8')
        return listFormOpeningTags(source)
          .filter(
            tag =>
              !tag.includes('action=') &&
              !/\bmethod="post"/.test(tag) &&
              tag.includes('onSubmit'),
          )
          .map(tag => `${file} ${tag.split('\n')[0].trim()}`)
      },
    )

    expect(offenders).toEqual([])
  })
})

describe('étape « votre adresse e-mail »', () => {
  const WIZARD = readFileSync(
    'components/reservation/reservation-wizard.tsx',
    'utf8',
  )

  it('n’envoie rien avant que le composant soit monté', () => {
    // Les deux écrans de l'étape partagent le formulaire : les deux boutons
    // d'envoi doivent attendre l'hydratation.
    expect(WIZARD.match(/disabled=\{!hydrated/g)).toHaveLength(2)
    expect(WIZARD).toContain('setHydrated(true)')
  })

  it('garde le pot de miel hors du parcours', () => {
    expect(WIZARD).toContain('tabIndex={-1}')
    expect(WIZARD).toContain('aria-hidden="true"')
  })
})
