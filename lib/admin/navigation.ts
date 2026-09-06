import { isDateKey } from '@/lib/reservation/time'

export type AdminNavigationItem =
  | 'agenda'
  | 'search'
  | 'create'
  | 'attention'
  | 'settings'

export const ADMIN_AGENDA_DATE_EVENT = 'admin-agenda-date-change'

export const getActiveAdminNavigationItem = (
  pathname: string,
): AdminNavigationItem | null => {
  if (pathname.startsWith('/admin/aide')) return null
  if (
    pathname.startsWith('/admin/a-traiter') ||
    pathname.startsWith('/admin/demandes') ||
    pathname.startsWith('/admin/conflits')
  )
    return 'attention'
  if (
    pathname.startsWith('/admin/search') ||
    pathname.startsWith('/admin/customers')
  )
    return 'search'
  if (pathname.startsWith('/admin/activity')) return null
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
 * Les cinq repères restent toujours à la même place. « À traiter » ne disparaît
 * pas quand tout va bien : la mémoire du geste compte davantage que le gain
 * d'une case vide, et son écran confirme alors simplement que tout est en ordre.
 */
export const getAdminNavigationEntries = (
  createHref: string,
): AdminNavigationEntry[] => [
  { key: 'agenda', label: 'Agenda', href: '/admin' },
  { key: 'search', label: 'Recherche', href: '/admin/search' },
  { key: 'create', label: 'Ajouter', href: createHref },
  { key: 'attention', label: 'À traiter', href: '/admin/a-traiter' },
  { key: 'settings', label: 'Réglages', href: '/admin/settings' },
]

/**
 * La grille de la barre du bas compte ses colonnes sur les entrées reçues.
 *
 * La liste est désormais fixe, mais garder ce calcul explicite protège le
 * dégagement du contenu si un repère est un jour remplacé.
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
