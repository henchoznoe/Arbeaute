import { describe, expect, it } from 'vitest'
import {
  formatPhoneForDisplay,
  normalizeEmail,
  normalizePhone,
  tryNormalizeIdentity,
} from '@/lib/reservation/identity'

describe('customer identity normalization', () => {
  it('normalizes email casing and whitespace', () => {
    expect(normalizeEmail('  CLIENT@Example.CH ')).toBe('client@example.ch')
  })

  it('normalizes Swiss and international phone numbers to E.164', () => {
    expect(normalizePhone('079 123 45 67')).toBe('+41791234567')
    expect(normalizePhone('+33 6 12 34 56 78')).toBe('+33612345678')
  })

  it('formats valid phone numbers for review', () => {
    expect(formatPhoneForDisplay('079 123 45 67')).toBe('+41 79 123 45 67')
    expect(formatPhoneForDisplay('+33 6 12 34 56 78')).toBe('+33 6 12 34 56 78')
  })

  it('rejects an invalid pair without revealing which field failed', () => {
    expect(tryNormalizeIdentity('client@example.ch', '123')).toBeNull()
    expect(tryNormalizeIdentity('invalid', '079 123 45 67')).toBeNull()
  })
})
