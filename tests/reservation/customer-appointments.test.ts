import { describe, expect, it } from 'vitest'
import {
  CUSTOMER_HISTORY_LIMIT,
  customerAppointmentStateLabels,
  getCustomerAppointmentState,
  getCustomerRebookingPath,
} from '@/lib/reservation/customer-appointments'

const now = new Date('2026-08-13T12:00:00.000Z')
const appointment = {
  status: 'CONFIRMED' as const,
  startsAt: new Date('2026-08-13T10:00:00.000Z'),
  endsAt: new Date('2026-08-13T11:00:00.000Z'),
}

describe('présentation des rendez-vous clients', () => {
  it('distingue un rendez-vous à venir, en cours et passé', () => {
    expect(
      getCustomerAppointmentState(
        {
          ...appointment,
          startsAt: new Date('2026-08-13T13:00:00.000Z'),
          endsAt: new Date('2026-08-13T14:00:00.000Z'),
        },
        now,
      ),
    ).toBe('UPCOMING')
    expect(
      getCustomerAppointmentState(
        {
          ...appointment,
          endsAt: new Date('2026-08-13T13:00:00.000Z'),
        },
        now,
      ),
    ).toBe('IN_PROGRESS')
    expect(getCustomerAppointmentState(appointment, now)).toBe('PAST')
  })

  it.each([
    ['CANCELLED', 'CANCELLED', 'Annulé'],
    ['COMPLETED', 'COMPLETED', 'Terminé'],
    ['NO_SHOW', 'NO_SHOW', 'Absence'],
  ] as const)(
    'priorise le statut métier %s sur la date',
    (status, expectedState, expectedLabel) => {
      const state = getCustomerAppointmentState(
        {
          ...appointment,
          status,
          startsAt: new Date('2026-08-20T10:00:00.000Z'),
          endsAt: new Date('2026-08-20T11:00:00.000Z'),
        },
        now,
      )

      expect(state).toBe(expectedState)
      expect(customerAppointmentStateLabels[state]).toBe(expectedLabel)
    },
  )

  it('borne explicitement l’historique affiché', () => {
    expect(CUSTOMER_HISTORY_LIMIT).toBe(8)
  })

  it('ne repropose que les prestations encore réservables', () => {
    const service = {
      slug: 'soin-visage-bio',
      isBookable: true,
      isVisible: true,
      isArchived: false,
    }

    expect(getCustomerRebookingPath(service)).toBe(
      '/reservation?service=soin-visage-bio',
    )
    expect(
      getCustomerRebookingPath({ ...service, isBookable: false }),
    ).toBeNull()
    expect(
      getCustomerRebookingPath({ ...service, isVisible: false }),
    ).toBeNull()
    expect(
      getCustomerRebookingPath({ ...service, isArchived: true }),
    ).toBeNull()
  })
})
