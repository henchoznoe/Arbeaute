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

/**
 * L'agenda ouvrait sur « Aucun rendez-vous à venir » suivi de « Le prochain
 * rendez-vous confirmé s'affichera ici dès la première réservation. » La phrase
 * était fausse : des réservations existaient, il n'en restait simplement plus
 * à venir. On expliquait à Arzu qu'elle n'avait jamais reçu personne.
 */
describe('carte du prochain rendez-vous', () => {
  const AGENDA = readFileSync('app/admin/page.tsx', 'utf8')

  it('ne prétend plus qu’aucune réservation n’a jamais eu lieu', () => {
    expect(AGENDA).not.toContain('dès la première réservation')
    expect(AGENDA).toContain('Plus aucun rendez-vous confirmé à venir.')
  })

  it('tient sur une ligne quand il n’y a rien à dire', () => {
    // `EmptyState` pose `py-8` et un titre centré : 230 px avant la bande de
    // semaine, pour le bloc qui a le moins à dire de tout l'écran.
    expect(AGENDA).not.toContain('<EmptyState')
    expect(AGENDA).toContain(
      'flex items-center gap-2 rounded-2xl border bg-card px-4 py-3',
    )
  })
})
