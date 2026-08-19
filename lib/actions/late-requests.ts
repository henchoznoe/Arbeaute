'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'
import {
  CUSTOMER_SESSION_EXPIRED,
  CUSTOMER_WRONG_ORIGIN,
} from '@/lib/actions/messages'
import prisma from '@/lib/core/prisma'
import {
  getCustomerSession,
  setCustomerSession,
} from '@/lib/core/session-cookies'
import {
  notifyLateRequestReceived,
  notifyLateRequestSubmitted,
} from '@/lib/email/late-request-notifications'
import { findCustomerForSession } from '@/lib/reservation/customers'
import { normalizeEmail, normalizePhone } from '@/lib/reservation/identity'
import {
  createLateRequestSerializable,
  LateRequestError,
  withdrawLateRequestSerializable,
} from '@/lib/reservation/late-requests'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import { formatAppointmentDate } from '@/lib/reservation/time'
import { checkRateLimit } from '@/lib/services/rate-limit'
import { formatPrice } from '@/lib/utils/format'
import { getRequestIp, hasSameOrigin } from '@/lib/utils/request'

/**
 * Une demande coûte l'attention d'Arzu, pas seulement une ligne en base : la
 * limite est donc bien plus serrée que celle de la réservation (5 par heure).
 */
const LATE_REQUEST_LIMIT = 3
const LATE_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000

const lateRequestSchema = z.object({
  serviceId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  email: z.string().trim().min(1).max(254),
  phone: z.string().trim().max(40).optional(),
  comment: z.string().trim().max(1000).optional(),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
})

export interface LateRequestResult {
  ok: boolean
  message: string
  reason?: 'INVALID_CUSTOMER' | 'SLOT_TAKEN' | 'TOO_MANY' | 'UNKNOWN'
  request?: {
    serviceLabel: string
    dateLabel: string
    priceLabel: string
    acknowledgementEmailTo: string | null
  }
}

const genericError = (): LateRequestResult => ({
  ok: false,
  reason: 'UNKNOWN',
  message:
    'La demande n’a pas pu être envoyée. Vérifiez vos informations et l’heure choisie, puis réessayez.',
})

const invalidCustomerError = (): LateRequestResult => ({
  ok: false,
  reason: 'INVALID_CUSTOMER',
  message:
    'Certaines coordonnées ne sont pas valides. Vérifiez votre adresse e-mail et votre numéro de téléphone.',
})

/**
 * Enregistre une demande pour une heure trop proche de la réservation en ligne.
 *
 * Rien n'est réservé : c'est le point que toute la formulation défend, ici comme
 * à l'écran et dans l'e-mail d'accusé.
 */
export const createLateRequest = async (
  input: unknown,
): Promise<LateRequestResult> => {
  if (!(await hasSameOrigin())) return genericError()
  const parsed = lateRequestSchema.safeParse(input)
  if (!parsed.success) {
    const customerFields = new Set([
      'firstName',
      'lastName',
      'email',
      'phone',
      'comment',
      'consent',
    ])
    return parsed.error.issues.some(issue =>
      customerFields.has(String(issue.path[0])),
    )
      ? invalidCustomerError()
      : genericError()
  }

  let email: string
  try {
    email = normalizeEmail(parsed.data.email)
  } catch {
    return invalidCustomerError()
  }

  // Comme pour la réservation : une personne déjà connue ne ressaisit ni son
  // nom ni son numéro, et le serveur les reprend sans que le navigateur ait
  // jamais su si l'adresse existait.
  const known = await prisma.customer.findFirst({
    where: { emailNormalized: email, anonymizedAt: null },
    select: { firstName: true, lastName: true, phone: true },
  })

  const lastName = parsed.data.lastName?.trim() || known?.lastName
  const firstName = parsed.data.firstName?.trim() || known?.firstName || null
  const rawPhone = parsed.data.phone?.trim() || known?.phone
  if (!lastName || !rawPhone) return invalidCustomerError()

  let phone: string
  try {
    phone = normalizePhone(rawPhone)
  } catch {
    return invalidCustomerError()
  }

  try {
    const ip = await getRequestIp()
    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit({
        action: 'late-request-ip',
        key: ip,
        limit: LATE_REQUEST_LIMIT,
        windowMs: LATE_REQUEST_WINDOW_MS,
      }),
      checkRateLimit({
        action: 'late-request-email',
        key: email,
        limit: LATE_REQUEST_LIMIT,
        windowMs: LATE_REQUEST_WINDOW_MS,
      }),
    ])
    if (!ipLimit.allowed || !emailLimit.allowed) return genericError()

    const { request, customer } = await createLateRequestSerializable(prisma, {
      serviceId: parsed.data.serviceId,
      requestedStartsAt: new Date(parsed.data.startsAt),
      firstName,
      lastName,
      email,
      phone,
      comment: parsed.data.comment || null,
    })

    const notifiable = {
      customerFirstName: firstName,
      customerLastName: lastName,
      customerPhone: phone,
      customerEmail: email,
      serviceNameSnapshot: request.serviceNameSnapshot,
      servicePriceCents: request.servicePriceCents,
      requestedStartsAt: request.requestedStartsAt,
      comment: request.comment,
      categoryName: request.categoryName,
    }
    notifyLateRequestSubmitted(notifiable)
    const acknowledgementEmailTo = notifyLateRequestReceived(notifiable)

    revalidatePath('/admin')
    revalidatePath('/admin/demandes')

    // Même raison qu'après une réservation : redemander l'adresse trente
    // secondes plus tard laisserait croire que rien n'a été enregistré.
    await setCustomerSession(customer.id, customer.identityVersion)

    return {
      ok: true,
      message: 'Votre demande a été transmise.',
      request: {
        serviceLabel: formatServiceLabel(
          request.serviceNameSnapshot,
          request.categoryName,
        ),
        dateLabel: formatAppointmentDate(request.requestedStartsAt),
        priceLabel: formatPrice(request.servicePriceCents),
        acknowledgementEmailTo,
      },
    }
  } catch (error) {
    if (error instanceof LateRequestError) {
      if (error.code === 'TOO_MANY_PENDING')
        return {
          ok: false,
          reason: 'TOO_MANY',
          message:
            'Vous avez déjà deux demandes en attente. Attendez une réponse, ou appelez l’institut.',
        }
      return {
        ok: false,
        reason: 'SLOT_TAKEN',
        message:
          'Cette heure n’est plus proposée. Choisissez-en une autre, s’il vous plaît.',
      }
    }
    return genericError()
  }
}

/** Retire une demande encore en attente, depuis « Mes rendez-vous ». */
export const withdrawLateRequest = async (
  requestId: string,
): Promise<{ ok: boolean; message: string }> => {
  if (!(await hasSameOrigin()))
    return { ok: false, message: CUSTOMER_WRONG_ORIGIN }

  // `findCustomerForSession` revalide `identityVersion` : une session ouverte
  // avant un changement de coordonnées ne doit plus rien pouvoir retirer.
  const session = await getCustomerSession()
  const customer = session
    ? await findCustomerForSession(prisma, session)
    : null
  if (!customer)
    return {
      ok: false,
      message: CUSTOMER_SESSION_EXPIRED,
    }

  try {
    await withdrawLateRequestSerializable(prisma, requestId, customer.id)
    revalidatePath('/mes-rendez-vous')
    revalidatePath('/admin')
    revalidatePath('/admin/demandes')
    return { ok: true, message: 'Votre demande a été retirée.' }
  } catch {
    return {
      ok: false,
      message:
        'Cette demande a déjà reçu une réponse. Rechargez la page pour la voir.',
    }
  }
}
