import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  hasSameOrigin: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
  revalidatePath: vi.fn(),
  updateMany: vi.fn(),
}))

vi.mock('@/lib/core/session-cookies', () => ({
  getAdminSession: mocks.getAdminSession,
}))
vi.mock('@/lib/utils/request', () => ({ hasSameOrigin: mocks.hasSameOrigin }))
vi.mock('@/lib/core/prisma', () => ({
  default: { appointmentActivity: { updateMany: mocks.updateMany } },
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

import { markAllAppointmentActivitiesRead } from '@/lib/actions/admin-activity'

describe('mark all appointment activities as read', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAdminSession.mockResolvedValue({ kind: 'admin' })
    mocks.hasSameOrigin.mockResolvedValue(true)
    mocks.updateMany.mockResolvedValue({ count: 3 })
  })

  it('updates unread activities and refreshes both admin views', async () => {
    await markAllAppointmentActivitiesRead()

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { readAt: null },
      data: { readAt: expect.any(Date) },
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/activity')
  })

  it('rejects a request without an admin session', async () => {
    mocks.getAdminSession.mockResolvedValue(null)

    await expect(markAllAppointmentActivitiesRead()).rejects.toThrow(
      'NEXT_REDIRECT',
    )
    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(mocks.hasSameOrigin).not.toHaveBeenCalled()
  })

  it('rejects a cross-origin request', async () => {
    mocks.hasSameOrigin.mockResolvedValue(false)

    await expect(markAllAppointmentActivitiesRead()).rejects.toThrow(
      'NEXT_REDIRECT',
    )
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })
})
