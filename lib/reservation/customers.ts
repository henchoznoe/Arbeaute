import { writeAuditEvent } from '@/lib/admin/audit'
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
 * Rattache une identité à partir de son e-mail seul.
 *
 * L'adresse désigne la personne : le téléphone la suit — quelqu'un qui change de
 * numéro reste la même personne — et le nom aussi.
 *
 * Volontairement en deux temps plutôt qu'un `upsert` : l'index unique sur
 * `emailNormalized` n'arrive qu'avec la migration de retrait des condensés, et
 * `upsert` produirait un `ON CONFLICT` que la base refuse tant que cet index
 * n'existe pas. Le tri par `firstSeenAt` retient la fiche la plus ancienne,
 * exactement celle que cette migration conservera en fusionnant les doublons.
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
  const existing = await transaction.customer.findFirst({
    where: { emailNormalized },
    orderBy: [{ firstSeenAt: 'asc' }, { id: 'asc' }],
    select: { id: true },
  })

  const updated = existing
    ? await transaction.customer.update({
        where: { id: existing.id },
        data: {
          ...names,
          email: emailNormalized,
          phone: phoneNormalized,
          phoneNormalized,
          lastSeenAt: new Date(),
        },
      })
    : await transaction.customer.create({
        data: {
          ...names,
          email: emailNormalized,
          emailNormalized,
          phone: phoneNormalized,
          phoneNormalized,
          // Transitoire : la version précédente du site cherche encore ses
          // fiches par ce condensé. Retiré par la release suivante, voir
          // docs/data-operations.md.
          identityDigest: createCustomerIdentityDigest(
            emailNormalized,
            phoneNormalized,
          ),
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
