import { describe, expect, it } from 'vitest'
import {
  findAppointmentConflicts,
  groupAppointmentConflicts,
} from '@/lib/admin/conflicts'

const appointment = (
  id: string,
  start: string,
  end: string,
  preparation = 0,
  cleanup = 0,
  status = 'CONFIRMED',
) => ({
  id,
  startsAt: new Date(start),
  endsAt: new Date(end),
  status,
  occupiedStartsAt: new Date(new Date(start).getTime() - preparation * 60_000),
  occupiedEndsAt: new Date(new Date(end).getTime() + cleanup * 60_000),
})
const a = appointment('a', '2026-09-05T08:00Z', '2026-09-05T09:00Z')

describe('superpositions', () => {
  it('conserve les liens directs dans une chaîne sans inventer une superposition', () => {
    const conflicts = findAppointmentConflicts([
      a,
      appointment('b', '2026-09-05T08:45Z', '2026-09-05T09:45Z'),
      appointment('c', '2026-09-05T09:30Z', '2026-09-05T10:00Z'),
    ])
    expect(conflicts.map(c => [c.firstId, c.secondId])).toEqual([
      ['a', 'b'],
      ['b', 'c'],
    ])
    expect(groupAppointmentConflicts(conflicts)).toEqual([['b', 'c', 'a']])
  })
  it('autorise les rendez-vous contigus et ignore les statuts inactifs', () => {
    expect(
      findAppointmentConflicts([
        a,
        appointment('b', '2026-09-05T09:00Z', '2026-09-05T10:00Z'),
        { ...a, id: 'cancelled', status: 'CANCELLED' },
        { ...a, id: 'done', status: 'COMPLETED' },
        { ...a, id: 'absent', status: 'NO_SHOW' },
      ]),
    ).toEqual([])
  })
  it('distingue le rangement d’un soin superposé et retire un conflit passé', () => {
    const b = appointment('b', '2026-09-05T09:00Z', '2026-09-05T10:00Z', 15)
    expect(findAppointmentConflicts([a, b])[0].buffersOnly).toBe(true)
    expect(
      findAppointmentConflicts([a, b], new Date('2026-09-05T09:00Z')),
    ).toEqual([])
    expect(
      findAppointmentConflicts([a, b], new Date('2026-09-05T08:50Z')),
    ).toHaveLength(1)
  })
  it('détecte le passage de minuit en heure suisse', () => {
    expect(
      findAppointmentConflicts([
        appointment('a', '2026-09-05T21:30Z', '2026-09-05T21:55Z', 0, 20),
        appointment('b', '2026-09-05T22:00Z', '2026-09-05T22:30Z'),
      ])[0].buffersOnly,
    ).toBe(true)
  })
  it('ne confond pas les deux 02:30 au passage à l’heure d’hiver', () => {
    expect(
      findAppointmentConflicts([
        appointment('a', '2026-10-25T00:15Z', '2026-10-25T00:45Z'),
        appointment('b', '2026-10-25T01:15Z', '2026-10-25T01:45Z'),
      ]),
    ).toEqual([])
  })
})
