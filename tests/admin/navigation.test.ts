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
    ['/admin/activity', null],
    ['/admin/activity?page=2', null],
    ['/admin/a-traiter', 'attention'],
    ['/admin/demandes', 'attention'],
    ['/admin/conflits', 'attention'],
    ['/admin/appointments/new', 'create'],
    ['/admin/aide', null],
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
 * Une entrée conditionnelle déplaçait tous les repères lorsqu'une demande
 * arrivait. La barre garde désormais cinq destinations stables.
 */
describe('barre du bas de l’administration', () => {
  it('garde toujours les cinq mêmes entrées', () => {
    expect(
      getAdminNavigationEntries('/admin/x').map(entry => entry.key),
    ).toEqual(['agenda', 'search', 'create', 'attention', 'settings'])
  })

  it('compte cinq colonnes', () => {
    const entries = getAdminNavigationEntries('/admin/x')
    expect(getBottomNavigationColumns(entries.length)).toBe(
      'repeat(5, minmax(0, 1fr))',
    )
  })

  it('garde des cibles au-dessus de 44 px', () => {
    const entries = getAdminNavigationEntries('/admin/x')

    expect(entries).toHaveLength(5)
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
 * Les compteurs, les trois repères de navigation et les bandeaux de sélection
 * doivent annoncer exactement le comportement visible.
 */
describe('ce que la navigation annonce', () => {
  const NAVIGATION = readFileSync(
    'components/admin/admin-navigation.tsx',
    'utf8',
  )
  const LAYOUT = readFileSync('app/admin/layout.tsx', 'utf8')
  const AGENDA_VIEW = readFileSync(
    'components/admin/admin-agenda-view.tsx',
    'utf8',
  )
  const SEARCH_TABS = readFileSync(
    'components/admin/admin-search-tabs.tsx',
    'utf8',
  )

  it('donne aux choses à traiter leur propre texte caché', () => {
    expect(LAYOUT).toContain('chose')
    expect(NAVIGATION).not.toContain('unreadActivityCount')
  })

  it('nomme les trois repères de navigation différemment', () => {
    const names = [
      ...NAVIGATION.matchAll(/aria-label="Administration, ([^"]+)"/g),
    ].map(match => match[1])

    expect(names).toHaveLength(3)
    expect(new Set(names).size).toBe(3)
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
