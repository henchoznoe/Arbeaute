import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { z } from 'zod/v4'

export const normalizeEmail = (value: string): string =>
  z.email().parse(value.trim().toLowerCase())

export const normalizePhone = (value: string): string => {
  const phone = parsePhoneNumberFromString(value.trim(), 'CH')
  if (!phone?.isValid()) throw new Error('Invalid phone number')
  return phone.number
}

export const tryNormalizeIdentity = (
  email: string,
  phone: string,
): { email: string; phone: string } | null => {
  try {
    return { email: normalizeEmail(email), phone: normalizePhone(phone) }
  } catch {
    return null
  }
}
