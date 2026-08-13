import { describe, expect, it } from 'vitest'
import {
  buildServiceReservationPath,
  resolveInitialServiceId,
} from '@/lib/reservation/deep-link'

const services = [
  { id: 'service-1', slug: 'soin-visage' },
  { id: 'service-2', slug: 'onglerie' },
]

describe('lien profond de réservation', () => {
  it('construit une URL stable et encode le slug', () => {
    expect(buildServiceReservationPath('soin visage')).toBe(
      '/reservation?service=soin%20visage',
    )
  })

  it('résout un slug issu du catalogue réservable', () => {
    expect(resolveInitialServiceId(services, 'onglerie')).toBe('service-2')
  })

  it.each([null, 'inconnu'])('ignore un slug absent ou inconnu', slug => {
    expect(resolveInitialServiceId(services, slug)).toBeNull()
  })
})
