import { writeAuditEvent } from '@/lib/admin/audit'
import { normalizeEmail, normalizePhone } from '@/lib/reservation/identity'
import type { Prisma } from '@/prisma/generated/prisma/client'
import type { AuditActorType } from '@/prisma/generated/prisma/enums'

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
 * numéro reste la même personne — et le nom aussi. L'index unique sur
 * `emailNormalized` rend l'`upsert` atomique : deux réservations simultanées
 * depuis la même adresse ne peuvent pas créer deux clients.
 */
export const upsertCustomerIdentity = async (
  transaction: Prisma.TransactionClient,
  input: CustomerIdentityInput,
  actorType: AuditActorType = 'CUSTOMER',
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
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNormalized: true,
    },
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

  const nameChanged =
    existing &&
    (existing.firstName !== names.firstName ||
      existing.lastName !== names.lastName)
  const phoneChanged = existing && existing.phoneNormalized !== phoneNormalized
  // Une nouvelle réservation ne modifie pas forcément les coordonnées :
  // renouveler lastSeenAt ne doit pas encombrer l'activité d'Arzu.
  if (!existing || nameChanged || phoneChanged)
    await writeAuditEvent(transaction, {
      actorType,
      actorId: actorType === 'ADMIN' ? 'admin' : updated.id,
      entityType: 'CUSTOMER',
      entityId: updated.id,
      action: existing ? 'UPDATED' : 'CREATED',
      ...(existing
        ? {
            after: {
              ...(nameChanged ? { nameChanged: true } : {}),
              ...(phoneChanged ? { phoneChanged: true } : {}),
            },
          }
        : {}),
    })
  return updated
}

/**
 * `anonymizedAt` fait partie de la condition : un client dont les coordonnées
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
