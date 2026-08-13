import { isDateKey } from '@/lib/reservation/time'

export type AdminNavigationItem = 'agenda' | 'activity' | 'create' | 'settings'

export const getActiveAdminNavigationItem = (
  pathname: string,
): AdminNavigationItem => {
  if (pathname.startsWith('/admin/activity')) return 'activity'
  if (pathname === '/admin/appointments/new') return 'create'
  if (
    pathname.startsWith('/admin/settings') ||
    pathname.startsWith('/admin/availability') ||
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
