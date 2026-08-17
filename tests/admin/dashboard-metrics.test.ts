import { describe, expect, it } from 'vitest'
import { buildDashboardMetrics } from '@/lib/admin/dashboard-metrics'

describe('admin dashboard metrics', () => {
  it('uses snapshots, effective openings and separate no-shows', () => {
    const metrics = buildDashboardMetrics({
      anchorDateKey: '2026-08-10',
      dateKeys: ['2026-08-10'],
      weekly: [{ dayOfWeek: 1, startMinute: 8 * 60, endMinute: 12 * 60 }],
      exceptions: [
        {
          type: 'UNAVAILABLE',
          startsAt: new Date('2026-08-10T08:00:00.000Z'),
          endsAt: new Date('2026-08-10T09:00:00.000Z'),
        },
      ],
      appointments: [
        {
          startsAt: new Date('2026-08-10T06:00:00.000Z'),
          occupiedStartsAt: new Date('2026-08-10T06:00:00.000Z'),
          occupiedEndsAt: new Date('2026-08-10T07:00:00.000Z'),
          serviceDurationMinutes: 60,
          servicePriceCents: 12_000,
          status: 'CONFIRMED',
        },
        {
          startsAt: new Date('2026-08-10T09:00:00.000Z'),
          occupiedStartsAt: new Date('2026-08-10T09:00:00.000Z'),
          occupiedEndsAt: new Date('2026-08-10T09:30:00.000Z'),
          serviceDurationMinutes: 30,
          servicePriceCents: 8_000,
          status: 'NO_SHOW',
        },
      ],
    })

    expect(metrics).toEqual({
      selectedDayCount: 2,
      bookedMinutes: 90,
      plannedRevenueCents: 12_000,
      occupancyRate: 50,
      noShowCount: 1,
    })
  })

  it('reports an unavailable occupancy rate when there is no opening', () => {
    expect(
      buildDashboardMetrics({
        anchorDateKey: '2026-08-16',
        dateKeys: ['2026-08-16'],
        weekly: [],
        exceptions: [],
        appointments: [],
      }).occupancyRate,
    ).toBeNull()
  })
})
