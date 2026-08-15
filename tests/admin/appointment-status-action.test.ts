import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  hasSameOrigin: vi.fn(),
  changeStatus: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/core/session-cookies', () => ({
  getAdminSession: mocks.getAdminSession,
}))
vi.mock('@/lib/utils/request', () => ({ hasSameOrigin: mocks.hasSameOrigin }))
vi.mock('@/lib/core/prisma', () => ({ default: { marker: 'prisma' } }))
vi.mock('@/lib/admin/appointment-status', async importOriginal => {
  const original =
    await importOriginal<typeof import('@/lib/admin/appointment-status')>()
  return {
    ...original,
    changeAdminAppointmentStatusSerializable: mocks.changeStatus,
  }
})
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { changeAdminAppointmentStatus } from '@/lib/actions/admin-appointment-status'

describe('admin appointment status action authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAdminSession.mockResolvedValue({ kind: 'admin' })
    mocks.hasSameOrigin.mockResolvedValue(true)
    mocks.changeStatus.mockResolvedValue({
      id: 'appointment-1',
      status: 'COMPLETED',
      customerId: 'customer-1',
    })
  })

  it('requires an authenticated same-origin admin request', async () => {
    await expect(
      changeAdminAppointmentStatus({
        appointmentId: 'appointment-1',
        targetStatus: 'COMPLETED',
      }),
    ).resolves.toEqual({
      ok: true,
      message: 'Le rendez-vous est marqué comme terminé.',
    })
    expect(mocks.changeStatus).toHaveBeenCalledOnce()
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      '/admin/customers/customer-1',
    )
  })

  it('rejects a missing admin session before checking the origin', async () => {
    mocks.getAdminSession.mockResolvedValue(null)

    await expect(
      changeAdminAppointmentStatus({
        appointmentId: 'appointment-1',
        targetStatus: 'NO_SHOW',
      }),
    ).resolves.toMatchObject({ ok: false })
    expect(mocks.hasSameOrigin).not.toHaveBeenCalled()
    expect(mocks.changeStatus).not.toHaveBeenCalled()
  })

  it('rejects a cross-origin mutation', async () => {
    mocks.hasSameOrigin.mockResolvedValue(false)

    await expect(
      changeAdminAppointmentStatus({
        appointmentId: 'appointment-1',
        targetStatus: 'NO_SHOW',
      }),
    ).resolves.toMatchObject({ ok: false })
    expect(mocks.changeStatus).not.toHaveBeenCalled()
  })
})
