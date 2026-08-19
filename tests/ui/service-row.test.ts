import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * La page des prestations mesurait 8236 px de défilement et 239 boutons à
 * 375 px. Chaque prestation occupait une ligne haute de 177 px, repliée sur
 * trois rangs, pour six contrôles — dont cinq boutons-icônes de forme
 * identique. « Archiver » et « Supprimer » y étaient voisins immédiats, alors
 * que l'un est réversible et l'autre non ; et la ligne du groupe portait ses
 * propres `⌃ ⌄` et son propre « Modifier », visuellement identiques à 250 px de
 * distance.
 */
const PAGE = readFileSync('app/admin/services/page.tsx', 'utf8')
const ROW_ACTIONS = readFileSync(
  'components/admin/service-row-actions.tsx',
  'utf8',
)

/** Le corps d'une ligne de prestation, de son ouverture à sa fermeture. */
const serviceRow = PAGE.slice(
  PAGE.indexOf('{category.services.map((service, serviceIndex) => ('),
  PAGE.indexOf('<form action={toggleCategory}'),
)

const countMatches = (source: string, pattern: RegExp): number =>
  source.match(pattern)?.length ?? 0

describe('ligne d’une prestation', () => {
  it('ne garde en façade que l’ouverture et l’ordre', () => {
    // Un lien qui ouvre la prestation, deux flèches, une ouverture pour le
    // reste : quatre cibles au lieu de six.
    expect(countMatches(serviceRow, /<Link\b/g)).toBe(1)
    expect(countMatches(serviceRow, /<SubmitButton\b/g)).toBe(2)
    expect(countMatches(serviceRow, /<ServiceRowActions\b/g)).toBe(1)
  })

  it('tient sur un rang', () => {
    // `flex-wrap` était ce qui autorisait les trois rangs.
    expect(serviceRow).not.toContain('flex-wrap')
    // Trois contrôles de 44 px et leurs intervalles laissent près de 200 px au
    // nom sur le plus étroit des téléphones visés.
    const controls = 3 * 44 + 3 * 8
    expect(375 - 24 - controls).toBeGreaterThan(150)
  })

  it('ne retire aucune capacité', () => {
    for (const action of [
      'duplicateService',
      'toggleServiceArchive',
      'ServiceDeleteButton',
    ])
      expect(ROW_ACTIONS).toContain(action)
  })

  it('éloigne la suppression de la mise de côté', () => {
    const asideAt = ROW_ACTIONS.indexOf('Mettre de côté')
    const deleteAt = ROW_ACTIONS.indexOf('<ServiceDeleteButton')
    expect(asideAt).toBeGreaterThan(0)
    expect(deleteAt).toBeGreaterThan(asideAt)
    // Un intervalle, un trait, et une phrase qui dit pourquoi hésiter.
    expect(ROW_ACTIONS).toContain('Supprimer définitivement')
    expect(ROW_ACTIONS).toContain('ne se reprend pas')
  })

  it('nomme chaque geste en toutes lettres', () => {
    // Cinq boutons-icônes de forme identique ne se distinguaient qu'à
    // l'aria-label.
    expect(ROW_ACTIONS).toContain('Dupliquer cette prestation')
    expect(ROW_ACTIONS).toContain('Remettre en service')
  })
})

describe('ligne d’un groupe', () => {
  const categoryHeader = PAGE.slice(
    PAGE.indexOf('<div className="flex flex-wrap items-center justify-between'),
    PAGE.indexOf('{category.services.map'),
  )

  it('se présente comme un groupe, pas comme une prestation', () => {
    expect(categoryHeader).toContain('Groupe')
    // Une forme de bouton différente de celle des lignes, qui sont en ghost.
    expect(countMatches(categoryHeader, /variant="secondary"/g)).toBe(2)
    expect(countMatches(serviceRow, /variant="ghost"/g)).toBe(2)
  })

  it('dit sur quoi porte son ordre', () => {
    expect(categoryHeader).toMatch(/Monter le groupe \$\{category\.name\}/)
    expect(categoryHeader).toMatch(/Descendre le groupe \$\{category\.name\}/)
  })
})
