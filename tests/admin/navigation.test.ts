import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  getActiveAdminNavigationItem,
  getAdminNavigationEntries,
  getBottomNavigationColumns,
  getBottomNavigationItemWidth,
  getNewAppointmentHref,
} from '@/lib/admin/navigation'

describe('admin navigation', () => {
  it.each([
    ['/admin', 'agenda'],
    ['/admin/appointments/appointment-1', 'agenda'],
    ['/admin/search', 'search'],
    ['/admin/customers/customer-1', 'search'],
    ['/admin/activity', 'activity'],
    ['/admin/activity?page=2', 'activity'],
    ['/admin/appointments/new', 'create'],
    ['/admin/settings', 'settings'],
    ['/admin/availability', 'settings'],
    ['/admin/emails', 'settings'],
    ['/admin/services/service-1', 'settings'],
  ])('identifies %s as %s', (pathname, expected) => {
    expect(getActiveAdminNavigationItem(pathname)).toBe(expected)
  })

  it('keeps a valid agenda date in the create link', () => {
    expect(getNewAppointmentHref('2026-08-20', '2026-08-13')).toBe(
      '/admin/appointments/new?date=2026-08-20',
    )
  })

  it('falls back to today when the date is missing or invalid', () => {
    expect(getNewAppointmentHref(null, '2026-08-13')).toBe(
      '/admin/appointments/new?date=2026-08-13',
    )
    expect(getNewAppointmentHref('2026-02-31', '2026-08-13')).toBe(
      '/admin/appointments/new?date=2026-08-13',
    )
  })
})

/**
 * La barre du bas comptait cinq colonnes fixes pour un tableau qui en contient
 * six dès qu'une demande attend : la sixième entrée passait à la ligne, la
 * barre doublait de hauteur, et le bas de page disparaissait dessous — au seul
 * moment où l'écran devait être net.
 */
describe('barre du bas de l’administration', () => {
  it('n’ajoute l’entrée « Demandes » que lorsqu’une demande attend', () => {
    const withoutRequests = getAdminNavigationEntries('/admin/x', 0)
    const withRequests = getAdminNavigationEntries('/admin/x', 1)

    expect(withoutRequests.map(entry => entry.key)).toEqual([
      'agenda',
      'search',
      'activity',
      'create',
      'settings',
    ])
    expect(withRequests.map(entry => entry.key)).toEqual([
      'agenda',
      'requests',
      'search',
      'activity',
      'create',
      'settings',
    ])
  })

  it('compte autant de colonnes que d’entrées', () => {
    for (const pendingRequestCount of [0, 1, 4]) {
      const entries = getAdminNavigationEntries('/admin/x', pendingRequestCount)
      expect(getBottomNavigationColumns(entries.length)).toBe(
        `repeat(${entries.length}, minmax(0, 1fr))`,
      )
    }
  })

  it('garde des cibles au-dessus de 44 px avec six entrées', () => {
    const entries = getAdminNavigationEntries('/admin/x', 1)

    expect(entries).toHaveLength(6)
    expect(getBottomNavigationItemWidth(entries.length)).toBeGreaterThanOrEqual(
      44,
    )
  })
})

describe('dégagement du contenu', () => {
  const NAVIGATION = readFileSync(
    'components/admin/admin-navigation.tsx',
    'utf8',
  )

  it('mesure la barre au lieu de parier sur une constante', () => {
    expect(NAVIGATION).toContain('--admin-nav-height')
    expect(NAVIGATION).toContain('new ResizeObserver(publishHeight)')
    // La grille ne doit plus figer son nombre de colonnes dans une classe.
    expect(NAVIGATION).not.toContain('grid-cols-5')
  })
})

/**
 * Trois annonces étaient fausses ou incomplètes : le compteur de demandes
 * empruntait le texte caché des activités non lues, les deux repères de
 * navigation portaient le même nom, et deux bandeaux déclaraient un motif ARIA
 * d'onglets qu'ils n'implémentaient pas.
 */
describe('ce que la navigation annonce', () => {
  const NAVIGATION = readFileSync(
    'components/admin/admin-navigation.tsx',
    'utf8',
  )
  const AGENDA_VIEW = readFileSync(
    'components/admin/admin-agenda-view.tsx',
    'utf8',
  )
  const SEARCH_TABS = readFileSync(
    'components/admin/admin-search-tabs.tsx',
    'utf8',
  )

  it('donne aux demandes leur propre texte caché', () => {
    expect(NAVIGATION).toContain('de dernière minute en attente')
    // Le texte des activités n'est plus réemployé pour les demandes.
    expect(NAVIGATION.match(/activité\$\{count > 1/g)).toHaveLength(1)
  })

  it('nomme les deux repères de navigation différemment', () => {
    const names = [
      ...NAVIGATION.matchAll(/aria-label="Administration, ([^"]+)"/g),
    ].map(match => match[1])

    expect(names).toHaveLength(2)
    expect(new Set(names).size).toBe(2)
  })

  it('ne déclare aucun rôle d’onglet sans le clavier qui va avec', () => {
    for (const source of [AGENDA_VIEW, SEARCH_TABS]) {
      expect(source).not.toContain('role="tablist"')
      expect(source).not.toContain('role="tab"')
      expect(source).not.toContain('role="tabpanel"')
      expect(source).not.toContain('aria-selected')
    }
    expect(AGENDA_VIEW).toContain('aria-pressed={isSelected}')
  })

  it('n’annonce plus une page là où rien ne navigue', () => {
    expect(SEARCH_TABS).not.toContain('aria-current')
    expect(SEARCH_TABS).toContain("aria-pressed={active === 'customers'}")
  })
})
