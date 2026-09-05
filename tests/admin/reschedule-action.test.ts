import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  origin: vi.fn(),
  move: vi.fn(),
  notify: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('@/lib/core/prisma', () => ({ default: {} }))
vi.mock('@/lib/core/session-cookies', () => ({
  getAdminSession: mocks.session,
}))
vi.mock('@/lib/utils/request', () => ({ hasSameOrigin: mocks.origin }))
vi.mock('@/lib/admin/reschedule', async original => ({
  ...(await original<typeof import('@/lib/admin/reschedule')>()),
  rescheduleAdminAppointment: mocks.move,
}))
vi.mock('@/lib/email/notifications', () => ({
  notifyAppointmentRescheduled: mocks.notify,
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.refresh }))

import { moveAdminAppointment } from '@/lib/actions/admin-reschedule'
import { AdminRescheduleError } from '@/lib/admin/reschedule'

const input = {
  appointmentId: 'a',
  expectedStartsAt: '2026-09-07T08:00:00.000Z',
  startsAt: '2026-09-07T09:00:00.000Z',
}
describe('action de déplacement', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.session.mockResolvedValue({})
    mocks.origin.mockResolvedValue(true)
  })
  it('contrôle la session et l’origine avant toute écriture', async () => {
    mocks.session.mockResolvedValue(null)
    expect((await moveAdminAppointment(input)).ok).toBe(false)
    mocks.session.mockResolvedValue({})
    mocks.origin.mockResolvedValue(false)
    expect((await moveAdminAppointment(input)).ok).toBe(false)
    expect(mocks.move).not.toHaveBeenCalled()
  })
  it('ne prépare l’e-mail qu’après un déplacement réussi et une seule fois', async () => {
    mocks.move.mockRejectedValueOnce(new AdminRescheduleError('UNAVAILABLE'))
    expect((await moveAdminAppointment(input)).ok).toBe(false)
    expect(mocks.notify).not.toHaveBeenCalled()
    mocks.move.mockResolvedValue({
      appointment: { id: 'a' },
      previousStartsAt: new Date(input.expectedStartsAt),
    })
    mocks.notify.mockReturnValue('test@example.ch')
    const result = await moveAdminAppointment(input)
    expect(result.ok).toBe(true)
    expect(result.message).toContain('est prévu')
    expect(mocks.notify).toHaveBeenCalledTimes(1)
  })
  it('n’annonce aucun e-mail quand l’envoi n’est pas configuré', async () => {
    mocks.move.mockResolvedValue({
      appointment: { id: 'a' },
      previousStartsAt: new Date(input.expectedStartsAt),
    })
    mocks.notify.mockReturnValue(null)
    expect((await moveAdminAppointment(input)).message).toContain(
      'Aucun e-mail ne sera envoyé',
    )
  })
})
