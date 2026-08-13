import { createCustomerIdentityDigest } from '@/lib/core/session-cookies'
import { normalizeEmail, normalizePhone } from '@/lib/reservation/identity'
import type { Prisma } from '@/prisma/generated/prisma/client'

interface CustomerIdentityInput {
  firstName: string | null
  lastName: string
  email: string
  phone: string
}

interface CustomerSessionIdentity {
  subject: string
  version: number
}

export const normalizeCustomerSearchName = (
  firstName: string | null,
  lastName: string,
): string =>
  [firstName, lastName]
    .filter(Boolean)
    .join(' ')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

/**
 * Rattache une identité uniquement si ses deux coordonnées normalisées
 * concordent. Un digest déjà associé à d'autres valeurs reste volontairement
 * sans fusion automatique.
 */
export const upsertCustomerIdentity = async (
  transaction: Prisma.TransactionClient,
  input: CustomerIdentityInput,
) => {
  const emailNormalized = normalizeEmail(input.email)
  const phoneNormalized = normalizePhone(input.phone)
  const identityDigest = createCustomerIdentityDigest(
    emailNormalized,
    phoneNormalized,
  )
  const names = {
    firstName: input.firstName?.trim() || null,
    lastName: input.lastName.trim(),
    searchName: normalizeCustomerSearchName(input.firstName, input.lastName),
  }
  const customer = await transaction.customer.upsert({
    where: { identityDigest },
    update: {},
    create: {
      identityDigest,
      ...names,
      email: emailNormalized,
      emailNormalized,
      phone: phoneNormalized,
      phoneNormalized,
    },
  })

  if (
    customer.emailNormalized !== emailNormalized ||
    customer.phoneNormalized !== phoneNormalized
  )
    return null

  return transaction.customer.update({
    where: { id: customer.id },
    data: {
      ...names,
      email: emailNormalized,
      phone: phoneNormalized,
      lastSeenAt: new Date(),
    },
  })
}

export const findCustomerForSession = (
  transaction: Pick<Prisma.TransactionClient, 'customer'>,
  session: CustomerSessionIdentity,
) =>
  transaction.customer.findFirst({
    where: {
      identityDigest: session.subject,
      identityVersion: session.version,
    },
    select: { id: true, identityDigest: true, identityVersion: true },
  })
