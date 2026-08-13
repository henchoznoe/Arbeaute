import { describe, expect, it } from 'vitest'
import {
  buildServiceReservationPath,
  resolveInitialServiceId,
} from '@/lib/reservation/deep-link'

const services = [
  { id: 'service-1', slug: 'soin-visage' },
  { id: 'service-2', slug: 'onglerie' },
  { id: 'service-3', slug: 'soin-visage-bio' },
  { id: 'service-4', slug: 'endospheres-visage' },
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

  it.each([
    ['soin-visage-bio', 'service-3'],
    ['endospheres-visage', 'service-4'],
  ])('résout le lien signalé %s', (slug, serviceId) => {
    expect(resolveInitialServiceId(services, slug)).toBe(serviceId)
  })

  it.each([null, 'inconnu'])('ignore un slug absent ou inconnu', slug => {
    expect(resolveInitialServiceId(services, slug)).toBeNull()
  })
})
