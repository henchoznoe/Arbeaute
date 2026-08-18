import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Une même donnée ne doit pas s'écrire de deux façons selon l'écran.
 *
 * La v2 avait remplacé onze mises en forme de prix par `formatPrice` et quinze
 * constructions de date par trois gabarits partagés — sans installer de
 * garde-fou. Deux écrans ont donc recommencé, et l'un d'eux réaffichait
 * « 75,5 CHF » là où le reste du site écrit « 75.50 CHF ». Ce test remplace la
 * vigilance par une règle vérifiable, et nomme le fichier fautif.
 *
 * Trois règles, et pas une de plus :
 *
 * 1. `Intl.NumberFormat` et `toLocaleString` n'existent que dans
 *    `lib/utils/format.ts`. C'est ce qui garantit qu'un prix passe par
 *    `formatPrice` et un décompte par `formatCount`.
 * 2. Un écran ne construit jamais de formateur de date : `app/` et
 *    `components/` importent une fonction de `lib/`, où vit la couche de mise
 *    en forme.
 * 3. `dateStyle` et `timeStyle` ne s'emploient nulle part : ces raccourcis ICU
 *    imposent leur propre ponctuation, que le projet passe ensuite son temps à
 *    normaliser (voir `normalizeFrenchDate`).
 */

/** Le seul module autorisé à mettre en forme un nombre. */
const NUMBER_FORMATTING_MODULE = join('lib', 'utils', 'format.ts')

/** Les écrans : ils affichent, ils ne mettent pas en forme. */
const SCREEN_DIRECTORIES = ['app', 'components']

const ALL_DIRECTORIES = [...SCREEN_DIRECTORIES, 'lib']

const NUMBER_FORMATTING = /Intl\.NumberFormat|\.toLocaleString\(/
const DATE_FORMATTER_CONSTRUCTION = /new Intl\.DateTimeFormat/
const ICU_PRESET = /\b(?:dateStyle|timeStyle):/

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter(entry => entry.endsWith('.ts') || entry.endsWith('.tsx'))
    .map(entry => join(directory, entry))

const findOffenders = (
  directories: string[],
  pattern: RegExp,
  isAllowed: (file: string) => boolean = () => false,
): string[] =>
  directories
    .flatMap(listSourceFiles)
    .filter(file => !isAllowed(file))
    .flatMap(file =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          pattern.test(line) ? [`${file}:${index + 1} ${line.trim()}`] : [],
        ),
    )

describe('mise en forme partagée', () => {
  it('ne met en forme un nombre que dans lib/utils/format.ts', () => {
    const offenders = findOffenders(
      ALL_DIRECTORIES,
      NUMBER_FORMATTING,
      file => file === NUMBER_FORMATTING_MODULE,
    )

    expect(offenders).toEqual([])
  })

  it('ne construit aucun formateur de date dans un écran', () => {
    const offenders = findOffenders(
      SCREEN_DIRECTORIES,
      DATE_FORMATTER_CONSTRUCTION,
    )

    expect(offenders).toEqual([])
  })

  it('n’emploie ni dateStyle ni timeStyle', () => {
    const offenders = findOffenders(ALL_DIRECTORIES, ICU_PRESET)

    expect(offenders).toEqual([])
  })
})
