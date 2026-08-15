import { describe, expect, it } from 'vitest'
import {
  getActiveAdminNavigationItem,
  getNewAppointmentHref,
} from '@/lib/admin/navigation'

describe('admin navigation', () => {
  it.each([
    ['/admin', 'agenda'],
    ['/admin/appointments/appointment-1', 'agenda'],
    ['/admin/search', 'search'],
    ['/admin/activity', 'activity'],
    ['/admin/activity?page=2', 'activity'],
    ['/admin/appointments/new', 'create'],
    ['/admin/settings', 'settings'],
    ['/admin/availability', 'settings'],
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
