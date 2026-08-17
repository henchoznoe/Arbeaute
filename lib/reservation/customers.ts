import { writeAuditEvent } from '@/lib/admin/audit'
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
 * Rattache une identité à partir de son e-mail seul.
 *
 * L'e-mail est la clé unique de la table : c'est ce qui garantit qu'une même
 * adresse ne crée jamais deux fiches, même sur deux réservations simultanées.
 * Le téléphone suit l'adresse — quelqu'un qui change de numéro reste la même
 * personne — et le nom aussi.
 */
export const upsertCustomerIdentity = async (
  transaction: Prisma.TransactionClient,
  input: CustomerIdentityInput,
) => {
  const emailNormalized = normalizeEmail(input.email)
  const phoneNormalized = normalizePhone(input.phone)
  const names = {
    firstName: input.firstName?.trim() || null,
    lastName: input.lastName.trim(),
    searchName: normalizeCustomerSearchName(input.firstName, input.lastName),
  }
  const existing = await transaction.customer.findUnique({
    where: { emailNormalized },
    select: { id: true },
  })
  const updated = await transaction.customer.upsert({
    where: { emailNormalized },
    update: {
      ...names,
      email: emailNormalized,
      phone: phoneNormalized,
      phoneNormalized,
      lastSeenAt: new Date(),
    },
    create: {
      ...names,
      email: emailNormalized,
      emailNormalized,
      phone: phoneNormalized,
      phoneNormalized,
    },
  })
  await writeAuditEvent(transaction, {
    actorType: 'CUSTOMER',
    actorId: updated.id,
    entityType: 'CUSTOMER',
    entityId: updated.id,
    action: existing ? 'UPDATED' : 'CREATED',
  })
  return updated
}

/**
 * `anonymizedAt` fait partie de la condition : une fiche dont les coordonnées
 * viennent d'être effacées ne doit plus ouvrir aucun espace personnel, même si
 * un cookie valide traîne encore.
 */
export const findCustomerForSession = (
  transaction: Pick<Prisma.TransactionClient, 'customer'>,
  session: CustomerSessionIdentity,
) =>
  transaction.customer.findFirst({
    where: {
      id: session.subject,
      identityVersion: session.version,
      anonymizedAt: null,
    },
    select: { id: true, identityVersion: true },
  })
