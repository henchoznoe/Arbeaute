'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod/v4'
import {
  CUSTOMER_SESSION_EXPIRED,
  CUSTOMER_WRONG_ORIGIN,
} from '@/lib/actions/messages'
import prisma from '@/lib/core/prisma'
import {
  clearCustomerSession,
  getCustomerSession,
  setCustomerSession,
} from '@/lib/core/session-cookies'
import {
  notifyAppointmentCancelled,
  notifyAppointmentConfirmed,
  notifyAppointmentRescheduled,
} from '@/lib/email/notifications'
import {
  cancelAppointmentSerializable,
  createAppointmentSerializable,
  moveAppointmentSerializable,
  ReservationError,
} from '@/lib/reservation/appointments'
import {
  type DayAvailability,
  findNextAvailableSlot,
  getAvailabilityByDate,
  type NextAvailableSlot,
} from '@/lib/reservation/availability'
import { getBookingSettings } from '@/lib/reservation/booking-settings'
import { createAppointmentCalendar } from '@/lib/reservation/calendar'
import { CUSTOMER_SESSION_MUTATION_LIMIT } from '@/lib/reservation/constants'
import { findCustomerForSession } from '@/lib/reservation/customers'
import { normalizeEmail, normalizePhone } from '@/lib/reservation/identity'
import { formatServiceLabel } from '@/lib/reservation/service-label'
import {
  addLocalDays,
  canCustomerChangeAppointment,
  formatAppointmentDate,
} from '@/lib/reservation/time'
import { checkRateLimit } from '@/lib/services/rate-limit'
import { formatPrice } from '@/lib/utils/format'
import { getRequestIp, hasSameOrigin } from '@/lib/utils/request'

/**
 * Le nom et le téléphone sont facultatifs *dans la requête* : quelqu'un dont la
 * client existe déjà ne les ressaisit pas, et le serveur les reprend depuis
 * ce client. Ils ne sont jamais facultatifs dans la base.
 */
const bookingSchema = z.object({
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

const appointmentMutationSchema = z.object({
  appointmentId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }).optional(),
})

export interface BookingResult {
  ok: boolean
  message: string
  reason?: 'INVALID_CUSTOMER' | 'SLOT_CONFLICT' | 'UNKNOWN'
  appointment?: {
    serviceLabel: string
    dateLabel: string
    priceLabel: string
    startsAt: string
    endsAt: string
    calendar: string
    /** Adresse à laquelle la confirmation part, `null` si aucun envoi n'a lieu. */
    confirmationEmailTo: string | null
  }
}

export interface MutationResult {
  ok: boolean
  message: string
  calendar?: string
  /**
   * Adresse prévenue, ou `null` si rien ne part.
   *
   * L'écran de confirmation d'une réservation nomme déjà l'adresse de
   * destination ; « Mes rendez-vous » traitait le même événement sans rien
   * dire. Deux écrans, deux comportements, pour un seul e-mail.
   */
  notifiedEmail?: string | null
}

const genericBookingError = (): BookingResult => ({
  ok: false,
  reason: 'UNKNOWN',
  message:
    'La réservation n’a pas pu être confirmée. Vérifiez vos informations et le créneau choisi.',
})

const invalidCustomerError = (): BookingResult => ({
  ok: false,
  reason: 'INVALID_CUSTOMER',
  message:
    'Certaines coordonnées ne sont pas valides. Vérifiez votre adresse e-mail et votre numéro de téléphone.',
})

const refreshAdminActivity = () => {
  revalidatePath('/admin')
  revalidatePath('/admin/activity')
}

/** Jours affichés d'un coup par le calendrier public. */
const PUBLIC_WEEK_LENGTH = 7

/**
 * Jours réellement demandés : la semaine affichée, plus celle d'avant et celle
 * d'après.
 *
 * `loadAvailabilityWindow` fait **quatre requêtes quelle que soit la longueur
 * de la fenêtre** : trois semaines coûtent donc exactement ce que coûtait une
 * seule, en un aller-retour identique. En échange, les deux flèches du
 * calendrier deviennent instantanées au lieu d'attendre le réseau.
 *
 * Ce n'est pas un cache serveur — les créneaux n'en ont jamais et n'en auront
 * jamais. C'est un affichage optimiste : en arrivant sur une semaine voisine,
 * le client redemande cette semaine-là en arrière-plan. Un créneau devenu
 * indisponible entre-temps produit au pire « Ce créneau vient d'être réservé »,
 * message qui existe déjà, et l'écriture reste protégée par la transaction
 * sérialisable et la contrainte `appointment_no_confirmed_overlap`.
 */
const PUBLIC_WINDOW_LENGTH = PUBLIC_WEEK_LENGTH * 3

/** Premier jour de la fenêtre : une semaine avant celle qui est affichée. */
const windowStart = (fromDateKey: string): string =>
  addLocalDays(fromDateKey, -PUBLIC_WEEK_LENGTH)

/**
 * Créneaux autour de la semaine affichée, en un seul aller-retour. Le
 * calendrier changeant de jour bien plus souvent que de semaine, charger la
 * fenêtre entière divise d'autant les appels serveur — sans jamais mettre les
 * créneaux en cache, qui doivent rester exacts.
 */
export const getPublicWeekAvailability = async (
  serviceId: string,
  fromDateKey: string,
): Promise<Record<string, DayAvailability>> => {
  try {
    const from = windowStart(z.string().min(1).parse(fromDateKey))
    const settings = await getBookingSettings()
    return await getAvailabilityByDate({
      database: prisma,
      serviceId: z.string().min(1).parse(serviceId),
      fromDateKey: from,
      toDateKey: addLocalDays(from, PUBLIC_WINDOW_LENGTH - 1),
      settings,
    })
  } catch {
    return {}
  }
}

export const getNextPublicAvailableSlot = async (
  serviceId: string,
  fromDateKey: string,
): Promise<NextAvailableSlot | null> => {
  try {
    const settings = await getBookingSettings()
    return await findNextAvailableSlot({
      database: prisma,
      serviceId: z.string().min(1).parse(serviceId),
      fromDateKey,
      settings,
    })
  } catch {
    return null
  }
}

/**
 * Cette adresse correspond-elle déjà à un client ?
 *
 * Ne renvoie **qu'un booléen** : ni nom, ni téléphone, ni identifiant ne
 * traversent le réseau. Le tunnel s'en sert uniquement pour décider s'il faut
 * afficher le second formulaire.
 *
 * L'écran répond donc « connu / inconnu » pour une adresse saisie. C'est le
 * même compromis que `/mes-rendez-vous`, documenté dans `SECURITY.md`, et il
 * porte ici sur strictement moins : savoir qu'une adresse est connue, pas y
 * accéder. La limite de tentatives est la même.
 *
 * **Un échec n'est jamais bloquant** : en cas de doute, on répond « inconnu »,
 * le second formulaire s'affiche, et la réservation aboutit quand même — saisir
 * ses coordonnées alors qu'on est déjà connu met simplement le client à jour.
 */
export const lookupCustomerByEmail = async (
  value: unknown,
): Promise<{ known: boolean }> => {
  try {
    if (!(await hasSameOrigin())) return { known: false }
    const limit = await checkRateLimit({
      action: 'customer-lookup',
      key: await getRequestIp(),
      limit: 10,
      windowMs: 15 * 60 * 1000,
    })
    if (!limit.allowed) return { known: false }

    const email = normalizeEmail(z.string().max(254).parse(value))
    const customer = await prisma.customer.findFirst({
      where: { emailNormalized: email, anonymizedAt: null },
      select: { id: true },
    })
    return { known: Boolean(customer) }
  } catch {
    return { known: false }
  }
}

export const createPublicAppointment = async (
  input: unknown,
): Promise<BookingResult> => {
  if (!(await hasSameOrigin())) return genericBookingError()
  const parsed = bookingSchema.safeParse(input)
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
      : genericBookingError()
  }

  let email: string
  try {
    email = normalizeEmail(parsed.data.email)
  } catch {
    return invalidCustomerError()
  }

  // Client existant : c'est lui qui fournit le nom et le numéro quand la
  // personne n'a saisi que son adresse. Rien de tout cela n'a transité par le
  // navigateur, qui n'a jamais su si l'adresse était connue.
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
        action: 'public-booking-ip',
        key: ip,
        limit: 5,
        windowMs: 60 * 60 * 1000,
      }),
      checkRateLimit({
        action: 'public-booking-email',
        key: email,
        limit: 5,
        windowMs: 60 * 60 * 1000,
      }),
    ])
    if (!ipLimit.allowed || !emailLimit.allowed) return genericBookingError()

    const { appointment, customer } = await createAppointmentSerializable(
      prisma,
      {
        serviceId: parsed.data.serviceId,
        startsAt: new Date(parsed.data.startsAt),
        firstName,
        lastName,
        email,
        phone,
        comment: parsed.data.comment || null,
      },
    )
    refreshAdminActivity()
    const confirmationEmailTo = notifyAppointmentConfirmed(appointment)

    // La personne vient de saisir son adresse : lui redemander trente secondes
    // plus tard, sur « Mes rendez-vous », laisserait croire que rien n'a été
    // enregistré. La session ne contient aucune coordonnée, dure quinze
    // minutes, et le trigger `customer_identity_version_trigger` l'invalide dès
    // qu'une adresse ou un téléphone change.
    await setCustomerSession(customer.id, customer.identityVersion)

    const serviceLabel = formatServiceLabel(
      appointment.serviceNameSnapshot,
      appointment.categoryName,
    )

    return {
      ok: true,
      message: 'Votre rendez-vous est confirmé.',
      appointment: {
        serviceLabel,
        dateLabel: formatAppointmentDate(appointment.startsAt),
        priceLabel: formatPrice(appointment.servicePriceCents),
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
        calendar: createAppointmentCalendar({
          id: appointment.id,
          serviceLabel,
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
        }),
        confirmationEmailTo,
      },
    }
  } catch (error) {
    if (error instanceof ReservationError)
      return {
        ok: false,
        reason: 'SLOT_CONFLICT',
        message:
          'Ce créneau vient d’être réservé. Choisissez-en un autre, s’il vous plaît.',
      }
    return genericBookingError()
  }
}

/**
 * L'e-mail seul ouvre l'espace personnel.
 *
 * Le téléphone était exigé en plus, à la virgule près : une personne qui avait
 * donné « 079 123 45 67 » puis tapait « +41791234567 » restait dehors. Le
 * compromis assumé est documenté dans `SECURITY.md` ; il repose sur la limite de
 * tentatives ci-dessous, sur une session de quinze minutes, et sur le fait
 * qu'aucun paiement ni donnée de santé n'est stocké.
 */
export const identifyCustomer = async (formData: FormData): Promise<void> => {
  const emailValue = formData.get('email')
  const honeypot = formData.get('website')
  const ip = await getRequestIp()
  let customer: { id: string; identityVersion: number } | null = null

  try {
    if (!(await hasSameOrigin())) throw new Error('Invalid origin')
    const limit = await checkRateLimit({
      action: 'customer-identification',
      key: ip,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    })
    if (limit.allowed && honeypot === '' && typeof emailValue === 'string') {
      const email = normalizeEmail(emailValue)
      customer = await prisma.customer.findFirst({
        where: { emailNormalized: email, anonymizedAt: null },
        select: { id: true, identityVersion: true },
      })
    }
  } catch {}

  if (!customer) redirect('/mes-rendez-vous?error=invalid')
  await setCustomerSession(customer.id, customer.identityVersion)
  redirect('/mes-rendez-vous')
}

export const logoutCustomer = async (): Promise<void> => {
  await clearCustomerSession()
  redirect('/mes-rendez-vous')
}

const getSessionCustomer = async () => {
  const session = await getCustomerSession()
  if (!session) return null
  return findCustomerForSession(prisma, session)
}

const requireCustomerMutation = async () => {
  const customer = await getSessionCustomer()
  if (!customer) return null
  const rateLimit = await checkRateLimit({
    action: 'customer-mutation',
    key: customer.id,
    limit: CUSTOMER_SESSION_MUTATION_LIMIT,
    windowMs: 60 * 60 * 1000,
  })
  return rateLimit.allowed ? customer : null
}

export const getCustomerMoveWeekAvailability = async (
  appointmentId: string,
  fromDateKey: string,
): Promise<Record<string, DayAvailability>> => {
  try {
    const customer = await getSessionCustomer()
    if (!customer) return {}
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        customerId: customer.id,
        status: 'CONFIRMED',
      },
      select: { id: true, serviceId: true, startsAt: true },
    })
    const settings = await getBookingSettings()
    if (
      !appointment ||
      !canCustomerChangeAppointment(appointment.startsAt, new Date())
    )
      return {}
    const from = windowStart(fromDateKey)
    return getAvailabilityByDate({
      database: prisma,
      serviceId: appointment.serviceId,
      fromDateKey: from,
      toDateKey: addLocalDays(from, PUBLIC_WINDOW_LENGTH - 1),
      excludeAppointmentId: appointment.id,
      // Déplacer un rendez-vous acquis n'ouvre pas droit aux heures sur
      // demande : le calendrier de déplacement ne montre que le réservable.
      settings: { ...settings, lateRequestsEnabled: false },
    })
  } catch {
    return {}
  }
}

export const getNextCustomerMoveAvailableSlot = async (
  appointmentId: string,
  fromDateKey: string,
): Promise<NextAvailableSlot | null> => {
  try {
    const customer = await getSessionCustomer()
    if (!customer) return null
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        customerId: customer.id,
        status: 'CONFIRMED',
      },
      select: { id: true, serviceId: true, startsAt: true },
    })
    const settings = await getBookingSettings()
    if (
      !appointment ||
      !canCustomerChangeAppointment(appointment.startsAt, new Date())
    )
      return null
    return findNextAvailableSlot({
      database: prisma,
      serviceId: appointment.serviceId,
      fromDateKey,
      excludeAppointmentId: appointment.id,
      settings,
    })
  } catch {
    return null
  }
}

export const moveCustomerAppointment = async (
  input: unknown,
): Promise<MutationResult> => {
  if (!(await hasSameOrigin()))
    return { ok: false, message: CUSTOMER_WRONG_ORIGIN }
  const parsed = appointmentMutationSchema.safeParse(input)
  if (!parsed.success || !parsed.data.startsAt)
    return {
      ok: false,
      message:
        'Cette nouvelle heure n’est pas valable. Choisissez-en une autre dans le calendrier.',
    }

  try {
    const customer = await requireCustomerMutation()
    if (!customer) return { ok: false, message: CUSTOMER_SESSION_EXPIRED }
    const appointment = await moveAppointmentSerializable(prisma, {
      appointmentId: parsed.data.appointmentId,
      startsAt: new Date(parsed.data.startsAt),
      customerId: customer.id,
    })
    revalidatePath('/mes-rendez-vous')
    refreshAdminActivity()
    const notifiedEmail = notifyAppointmentRescheduled(
      appointment,
      appointment.previousStartsAt,
    )
    return {
      ok: true,
      message: 'Votre rendez-vous a bien été déplacé.',
      notifiedEmail,
      calendar: createAppointmentCalendar({
        id: appointment.id,
        serviceLabel: formatServiceLabel(
          appointment.serviceNameSnapshot,
          appointment.categoryName,
        ),
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
      }),
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ReservationError && error.code === 'SLOT_UNAVAILABLE'
          ? 'Cette heure vient d’être prise. Choisissez-en une autre, s’il vous plaît.'
          : 'Ce rendez-vous ne peut plus être déplacé.',
    }
  }
}

export const cancelCustomerAppointment = async (
  input: unknown,
): Promise<MutationResult> => {
  if (!(await hasSameOrigin()))
    return { ok: false, message: CUSTOMER_WRONG_ORIGIN }
  const parsed = appointmentMutationSchema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      message:
        'Ce rendez-vous n’a pas pu être identifié. Rechargez « Mes rendez-vous », puis recommencez.',
    }

  try {
    const customer = await requireCustomerMutation()
    if (!customer) return { ok: false, message: CUSTOMER_SESSION_EXPIRED }
    const cancelled = await cancelAppointmentSerializable(
      prisma,
      parsed.data.appointmentId,
      customer.id,
    )
    revalidatePath('/mes-rendez-vous')
    refreshAdminActivity()
    const notifiedEmail = notifyAppointmentCancelled(cancelled)
    return {
      ok: true,
      message: 'Votre rendez-vous a bien été annulé.',
      notifiedEmail,
    }
  } catch {
    return {
      ok: false,
      message:
        'Ce rendez-vous ne peut plus être modifié : il a déjà été annulé, ou il est passé.',
    }
  }
}
