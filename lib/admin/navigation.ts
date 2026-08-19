import { isDateKey } from '@/lib/reservation/time'

export type AdminNavigationItem =
  | 'agenda'
  | 'requests'
  | 'search'
  | 'activity'
  | 'create'
  | 'settings'

export const ADMIN_AGENDA_DATE_EVENT = 'admin-agenda-date-change'

export const getActiveAdminNavigationItem = (
  pathname: string,
): AdminNavigationItem => {
  if (pathname.startsWith('/admin/demandes')) return 'requests'
  if (
    pathname.startsWith('/admin/search') ||
    pathname.startsWith('/admin/customers')
  )
    return 'search'
  if (pathname.startsWith('/admin/activity')) return 'activity'
  if (pathname === '/admin/appointments/new') return 'create'
  if (
    pathname.startsWith('/admin/settings') ||
    pathname.startsWith('/admin/data') ||
    pathname.startsWith('/admin/availability') ||
    pathname.startsWith('/admin/emails') ||
    pathname.startsWith('/admin/services')
  )
    return 'settings'
  return 'agenda'
}

export const getNewAppointmentHref = (
  requestedDate: string | null | undefined,
  fallbackDate: string,
): string => {
  const date =
    requestedDate && isDateKey(requestedDate) ? requestedDate : fallbackDate
  return `/admin/appointments/new?date=${date}`
}

export interface AdminNavigationEntry {
  key: AdminNavigationItem
  label: string
  href: string
}

/**
 * Les entrées de la barre, dans leur ordre d'affichage.
 *
 * « Demandes » ne s'insère que lorsqu'une demande attend : une entrée de plus
 * encombrerait la barre du téléphone en permanence pour un cas rare. C'est bien
 * la liste qui décide du nombre de colonnes — voir `getBottomNavigationColumns`.
 */
export const getAdminNavigationEntries = (
  createHref: string,
  pendingRequestCount: number,
): AdminNavigationEntry[] => [
  { key: 'agenda', label: 'Agenda', href: '/admin' },
  ...(pendingRequestCount > 0
    ? [{ key: 'requests' as const, label: 'Demandes', href: '/admin/demandes' }]
    : []),
  { key: 'search', label: 'Recherche', href: '/admin/search' },
  { key: 'activity', label: 'Activité', href: '/admin/activity' },
  { key: 'create', label: 'Ajouter', href: createHref },
  { key: 'settings', label: 'Réglages', href: '/admin/settings' },
]

/**
 * La grille de la barre du bas compte ses colonnes sur les entrées reçues.
 *
 * Figée à cinq, la sixième passait à la ligne : la barre doublait de hauteur au
 * moment précis où une demande attendait une réponse, et le bas de page
 * disparaissait dessous.
 */
export const getBottomNavigationColumns = (itemCount: number): string =>
  `repeat(${itemCount}, minmax(0, 1fr))`

/** Le plus étroit des téléphones visés par le projet. */
const NARROW_VIEWPORT_WIDTH = 360

/** `px-1` de chaque côté de la barre. */
const BOTTOM_NAVIGATION_PADDING = 8

/**
 * Largeur d'une entrée sur le plus étroit des téléphones visés. Sert à vérifier
 * que la cible tactile reste au-dessus de 44 px, six entrées comprises.
 */
export const getBottomNavigationItemWidth = (
  itemCount: number,
  viewportWidth: number = NARROW_VIEWPORT_WIDTH,
): number => (viewportWidth - BOTTOM_NAVIGATION_PADDING) / itemCount
