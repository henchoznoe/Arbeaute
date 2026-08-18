import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * L'écran de confirmation s'appuie sur la valeur retournée ici pour décider
 * s'il annonce un e-mail. Promettre un envoi qui n'a pas lieu serait pire que
 * de ne rien dire : ces tests verrouillent les trois cas.
 */

const configured = { value: true }
const queued: (() => Promise<void>)[] = []

vi.mock('@/lib/core/env', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/core/env')>()
  return {
    ...actual,
    get isEmailConfigured() {
      return configured.value
    },
  }
})

vi.mock('next/server', () => ({
  after: (task: () => Promise<void>) => {
    queued.push(task)
  },
}))

vi.mock('@/lib/email/send', () => ({ deliverEmail: vi.fn() }))

const { notifyAppointmentConfirmed } = await import('@/lib/email/notifications')

const appointment = {
  id: 'apt-1',
  customerEmail: 'claire@example.ch',
  customerFirstName: 'Claire',
  customerLastName: 'Meyer',
  serviceNameSnapshot: 'Épilation sourcils',
  servicePriceCents: 3500,
  startsAt: new Date('2026-09-14T08:00:00.000Z'),
  endsAt: new Date('2026-09-14T08:30:00.000Z'),
}

describe('notifyAppointmentConfirmed', () => {
  beforeEach(() => {
    configured.value = true
    queued.length = 0
  })

  it('renvoie l’adresse et met l’envoi en file', () => {
    expect(notifyAppointmentConfirmed(appointment)).toBe('claire@example.ch')
    expect(queued).toHaveLength(1)
  })

  it('ne promet rien quand l’envoi n’est pas configuré', () => {
    configured.value = false
    expect(notifyAppointmentConfirmed(appointment)).toBeNull()
    expect(queued).toHaveLength(0)
  })

  it('ne promet rien quand le rendez-vous n’a pas d’adresse', () => {
    expect(
      notifyAppointmentConfirmed({ ...appointment, customerEmail: null }),
    ).toBeNull()
    expect(queued).toHaveLength(0)
  })
})
