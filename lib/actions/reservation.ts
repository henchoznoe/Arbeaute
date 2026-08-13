'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod/v4'
import prisma from '@/lib/core/prisma'
import {
  clearCustomerSession,
  createCustomerIdentityDigest,
  getCustomerSession,
  setCustomerSession,
} from '@/lib/core/session-cookies'
import {
  cancelAppointmentSerializable,
  createAppointmentSerializable,
  moveAppointmentSerializable,
  ReservationError,
} from '@/lib/reservation/appointments'
import {
  type AvailableSlot,
  type DayAvailability,
  findNextAvailableSlot,
  getAvailabilityByDate,
  getAvailableSlots,
  type NextAvailableSlot,
} from '@/lib/reservation/availability'
import { createAppointmentCalendar } from '@/lib/reservation/calendar'
import { CUSTOMER_SESSION_MUTATION_LIMIT } from '@/lib/reservation/constants'
import { normalizeEmail, normalizePhone } from '@/lib/reservation/identity'
import {
  addLocalDays,
  canCustomerChangeAppointment,
  formatAppointmentDate,
} from '@/lib/reservation/time'
import { checkRateLimit } from '@/lib/services/rate-limit'
import { getRequestIp, hasSameOrigin } from '@/lib/utils/request'

const bookingSchema = z.object({
  serviceId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().min(1).max(254),
  phone: z.string().trim().min(1).max(40),
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
  appointment?: {
    serviceName: string
    dateLabel: string
    priceLabel: string
    calendar: string
  }
}

export interface MutationResult {
  ok: boolean
  message: string
  calendar?: string
}

const genericBookingError = (): BookingResult => ({
  ok: false,
  message:
    'La réservation n’a pas pu être confirmée. Vérifiez vos informations et le créneau choisi.',
})

const refreshAdminActivity = () => {
  revalidatePath('/admin')
  revalidatePath('/admin/activity')
}

/** Nombre de jours affichés d'un coup par le calendrier public. */
const PUBLIC_WEEK_LENGTH = 7

/**
 * Créneaux de la semaine affichée, en un seul aller-retour. Le calendrier
 * changeant de jour bien plus souvent que de semaine, charger les sept jours
 * ensemble divise d'autant les appels serveur — sans jamais mettre les
 * créneaux en cache, qui doivent rester exacts.
 */
export const getPublicWeekAvailability = async (
  serviceId: string,
  fromDateKey: string,
): Promise<Record<string, DayAvailability>> => {
  try {
    const from = z.string().min(1).parse(fromDateKey)
    return await getAvailabilityByDate({
      database: prisma,
      serviceId: z.string().min(1).parse(serviceId),
      fromDateKey: from,
      toDateKey: addLocalDays(from, PUBLIC_WEEK_LENGTH - 1),
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
    return await findNextAvailableSlot({
      database: prisma,
      serviceId: z.string().min(1).parse(serviceId),
      fromDateKey,
    })
  } catch {
    return null
  }
}

export const createPublicAppointment = async (
  input: unknown,
): Promise<BookingResult> => {
  if (!(await hasSameOrigin())) return genericBookingError()
  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) return genericBookingError()

  let email: string
  let phone: string
  try {
    email = normalizeEmail(parsed.data.email)
    phone = normalizePhone(parsed.data.phone)
  } catch {
    return genericBookingError()
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

    const appointment = await createAppointmentSerializable(prisma, {
      serviceId: parsed.data.serviceId,
      startsAt: new Date(parsed.data.startsAt),
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email,
      phone,
      comment: parsed.data.comment || null,
    })
    refreshAdminActivity()

    return {
      ok: true,
      message: 'Votre rendez-vous est confirmé.',
      appointment: {
        serviceName: appointment.serviceNameSnapshot,
        dateLabel: formatAppointmentDate(appointment.startsAt),
        priceLabel: `${(appointment.servicePriceCents / 100).toLocaleString('fr-CH')} CHF`,
        calendar: createAppointmentCalendar({
          id: appointment.id,
          serviceName: appointment.serviceNameSnapshot,
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
        }),
      },
    }
  } catch (error) {
    if (error instanceof ReservationError)
      return {
        ok: false,
        message:
          'Ce créneau vient d’être réservé. Choisissez-en un autre, s’il vous plaît.',
      }
    return genericBookingError()
  }
}

export const identifyCustomer = async (formData: FormData): Promise<void> => {
  const emailValue = formData.get('email')
  const phoneValue = formData.get('phone')
  const honeypot = formData.get('website')
  const ip = await getRequestIp()
  let identityDigest: string | null = null

  try {
    if (!(await hasSameOrigin())) throw new Error('Invalid origin')
    const limit = await checkRateLimit({
      action: 'customer-identification',
      key: ip,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    })
    if (
      limit.allowed &&
      honeypot === '' &&
      typeof emailValue === 'string' &&
      typeof phoneValue === 'string'
    ) {
      const email = normalizeEmail(emailValue)
      const phone = normalizePhone(phoneValue)
      const candidateDigest = createCustomerIdentityDigest(email, phone)
      const exists = await prisma.appointment.findFirst({
        where: {
          customerIdentityDigest: candidateDigest,
          status: 'CONFIRMED',
          startsAt: { gt: new Date() },
        },
        select: { id: true },
      })
      if (exists) identityDigest = candidateDigest
    }
  } catch {}

  if (!identityDigest) redirect('/mes-rendez-vous?error=invalid')
  await setCustomerSession(identityDigest, 1)
  redirect('/mes-rendez-vous')
}

export const logoutCustomer = async (): Promise<void> => {
  await clearCustomerSession()
  redirect('/mes-rendez-vous')
}

const requireCustomerMutation = async () => {
  const session = await getCustomerSession()
  if (!session) return null
  const rateLimit = await checkRateLimit({
    action: 'customer-mutation',
    key: session.subject,
    limit: CUSTOMER_SESSION_MUTATION_LIMIT,
    windowMs: 60 * 60 * 1000,
  })
  return rateLimit.allowed ? session : null
}

export const getCustomerMoveAvailability = async (
  appointmentId: string,
  dateKey: string,
): Promise<AvailableSlot[]> => {
  try {
    const session = await getCustomerSession()
    if (!session) return []
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        customerIdentityDigest: session.subject,
        status: 'CONFIRMED',
      },
      select: { id: true, serviceId: true, startsAt: true },
    })
    if (!appointment || !canCustomerChangeAppointment(appointment.startsAt))
      return []
    return getAvailableSlots({
      database: prisma,
      serviceId: appointment.serviceId,
      dateKey,
      excludeAppointmentId: appointment.id,
    })
  } catch {
    return []
  }
}

export const moveCustomerAppointment = async (
  input: unknown,
): Promise<MutationResult> => {
  if (!(await hasSameOrigin()))
    return { ok: false, message: 'La demande est invalide.' }
  const parsed = appointmentMutationSchema.safeParse(input)
  if (!parsed.success || !parsed.data.startsAt)
    return { ok: false, message: 'Le nouveau créneau est invalide.' }

  try {
    const session = await requireCustomerMutation()
    if (!session)
      return { ok: false, message: 'Votre session a expiré. Reconnectez-vous.' }
    const appointment = await moveAppointmentSerializable(prisma, {
      appointmentId: parsed.data.appointmentId,
      startsAt: new Date(parsed.data.startsAt),
      identityDigest: session.subject,
    })
    revalidatePath('/mes-rendez-vous')
    refreshAdminActivity()
    return {
      ok: true,
      message: 'Votre rendez-vous a bien été déplacé.',
      calendar: createAppointmentCalendar({
        id: appointment.id,
        serviceName: appointment.serviceNameSnapshot,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
      }),
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ReservationError && error.code === 'SLOT_UNAVAILABLE'
          ? 'Ce créneau n’est plus disponible.'
          : 'Ce rendez-vous ne peut plus être déplacé.',
    }
  }
}

export const cancelCustomerAppointment = async (
  input: unknown,
): Promise<MutationResult> => {
  if (!(await hasSameOrigin()))
    return { ok: false, message: 'La demande est invalide.' }
  const parsed = appointmentMutationSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, message: 'Ce rendez-vous est invalide.' }

  try {
    const session = await requireCustomerMutation()
    if (!session)
      return { ok: false, message: 'Votre session a expiré. Reconnectez-vous.' }
    await cancelAppointmentSerializable(
      prisma,
      parsed.data.appointmentId,
      session.subject,
    )
    await clearCustomerSession()
    revalidatePath('/mes-rendez-vous')
    refreshAdminActivity()
    return { ok: true, message: 'Votre rendez-vous a bien été annulé.' }
  } catch {
    return { ok: false, message: 'Ce rendez-vous ne peut plus être annulé.' }
  }
}
