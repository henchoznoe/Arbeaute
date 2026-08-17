import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * L'institut reçoit aussi des hommes : « cliente » ne doit plus apparaître, ni
 * dans un libellé, ni dans un commentaire. La règle et ses reformulations sont
 * dans `docs/vocabulaire.md`.
 *
 * Le mot est cherché entier : `clientErrors` n'est donc pas concerné, et
 * « clientèle », collectif et sans genre porté sur les personnes, reste permis.
 */
const SCANNED_DIRECTORIES = ['app', 'components', 'lib']
const GENDERED_TERM = /\bclientes?\b/i

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter(entry => entry.endsWith('.ts') || entry.endsWith('.tsx'))
    .map(entry => join(directory, entry))

describe('vocabulaire sans genre', () => {
  it('n’emploie plus « cliente » dans le code servi', () => {
    const offenders = SCANNED_DIRECTORIES.flatMap(listSourceFiles).flatMap(
      file =>
        readFileSync(file, 'utf8')
          .split('\n')
          .flatMap((line, index) =>
            GENDERED_TERM.test(line)
              ? [`${file}:${index + 1} ${line.trim()}`]
              : [],
          ),
    )

    expect(offenders).toEqual([])
  })
})
