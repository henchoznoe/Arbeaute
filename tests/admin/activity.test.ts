import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findMany: vi.fn(),
}))

vi.mock('@/lib/core/prisma', () => ({
  default: {
    appointmentActivity: {
      count: mocks.count,
      findMany: mocks.findMany,
    },
  },
}))

import {
  formatActivityCreatedAt,
  formatActivityMessage,
  getActivityOverview,
  getActivityPage,
} from '@/lib/admin/activity'

const baseActivity = {
  type: 'CREATED' as const,
  customerFirstNameSnapshot: 'Marie',
  customerLastNameSnapshot: 'Dupont',
  serviceNameSnapshot: 'Soin du visage',
  appointmentStartsAt: new Date('2026-08-10T12:00:00.000Z'),
  previousAppointmentStartsAt: null,
}

describe('admin activity formatting', () => {
  it('formats a public booking in the salon time zone', () => {
    expect(formatActivityMessage(baseActivity)).toBe(
      'Marie Dupont a réservé Soin du visage pour le lundi 10 août à 14:00.',
    )
    expect(formatActivityCreatedAt(new Date('2026-08-10T10:30:00.000Z'))).toBe(
      '10.08.26 12:30',
    )
  })

  it('includes both slots for a reschedule', () => {
    expect(
      formatActivityMessage({
        ...baseActivity,
        type: 'RESCHEDULED',
        appointmentStartsAt: new Date('2026-08-11T13:00:00.000Z'),
        previousAppointmentStartsAt: baseActivity.appointmentStartsAt,
      }),
    ).toBe(
      'Marie Dupont a déplacé Soin du visage du lundi 10 août à 14:00 au mardi 11 août à 15:00.',
    )
  })

  it('formats a cancellation with a last name only', () => {
    expect(
      formatActivityMessage({
        ...baseActivity,
        type: 'CANCELLED',
        customerFirstNameSnapshot: null,
      }),
    ).toBe('Dupont a annulé Soin du visage, prévu le lundi 10 août à 14:00.')
  })
})

describe('admin activity queries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads a three-item overview and its unread count', async () => {
    mocks.findMany.mockResolvedValue(['activity'])
    mocks.count.mockResolvedValue(12)

    await expect(getActivityOverview()).resolves.toEqual({
      activities: ['activity'],
      unreadCount: 12,
    })
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3, orderBy: { createdAt: 'desc' } }),
    )
    expect(mocks.count).toHaveBeenCalledWith({ where: { readAt: null } })
  })

  it('clamps pagination and loads twenty items per page', async () => {
    mocks.count.mockResolvedValueOnce(45).mockResolvedValueOnce(4)
    mocks.findMany.mockResolvedValue(['activity'])

    await expect(getActivityPage(99)).resolves.toEqual({
      activities: ['activity'],
      unreadCount: 4,
      page: 3,
      totalPages: 3,
      totalCount: 45,
    })
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    )
  })
})
