'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod/v4'
import {
  AdminAgendaError,
  buildAvailabilityExceptionRows,
  cancelAdminAppointmentSerializable,
  isAdminAppointmentInsidePublicHours,
  saveAdminAppointmentSerializable,
} from '@/lib/admin/agenda'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { MAX_AVAILABILITY_EXCEPTION_RANGE_DAYS } from '@/lib/reservation/constants'
import { normalizeEmail, normalizePhone } from '@/lib/reservation/identity'
import { isDateKey, localDateMinuteToUtc } from '@/lib/reservation/time'
import { hasSameOrigin } from '@/lib/utils/request'

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/

const appointmentSchema = z.object({
  appointmentId: z.string().min(1).optional(),
  serviceId: z.string().min(1),
  date: z.string().refine(isDateKey),
  time: z.string().regex(timePattern),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().max(254).optional(),
  phone: z.string().trim().max(40).optional(),
  comment: z.string().trim().max(1000).optional(),
  acknowledgeOutsideHours: z.boolean().optional(),
})

const requireAdminMutation = async (): Promise<boolean> =>
  Boolean((await getAdminSession()) && (await hasSameOrigin()))

const parseMinute = (value: string): number => {
  const [, hours, minutes] = timePattern.exec(value) ?? []
  return Number(hours) * 60 + Number(minutes)
}

export interface AdminAppointmentFormInput {
  appointmentId?: string
  serviceId: string
  date: string
  time: string
  firstName?: string
  lastName: string
  email?: string
  phone?: string
  comment?: string
  acknowledgeOutsideHours?: boolean
}

export interface AdminAppointmentResult {
  ok: boolean
  message: string
  appointmentId?: string
  needsOutsideHoursConfirmation?: boolean
}

export const saveAdminAppointment = async (
  input: AdminAppointmentFormInput,
): Promise<AdminAppointmentResult> => {
  if (!(await requireAdminMutation()))
    return { ok: false, message: 'Votre session admin a expiré.' }
  const parsed = appointmentSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, message: 'Vérifiez les informations saisies.' }

  const minute = parseMinute(parsed.data.time)
  if (minute % 15 !== 0)
    return {
      ok: false,
      message: 'L’heure de début doit être alignée au quart d’heure.',
    }

  let email: string | null = null
  let phone: string | null = null
  try {
    email = parsed.data.email ? normalizeEmail(parsed.data.email) : null
    phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null
  } catch {
    return {
      ok: false,
      message: 'L’adresse email ou le numéro de téléphone est invalide.',
    }
  }

  try {
    const startsAt = localDateMinuteToUtc(parsed.data.date, minute)
    const insidePublicHours = await isAdminAppointmentInsidePublicHours(
      prisma,
      parsed.data.serviceId,
      startsAt,
    )
    if (!insidePublicHours && !parsed.data.acknowledgeOutsideHours)
      return {
        ok: false,
        message:
          'Ce rendez-vous est hors des horaires publics ou traverse une indisponibilité.',
        needsOutsideHoursConfirmation: true,
      }

    const appointment = await saveAdminAppointmentSerializable(prisma, {
      appointmentId: parsed.data.appointmentId,
      serviceId: parsed.data.serviceId,
      startsAt,
      firstName: parsed.data.firstName || null,
      lastName: parsed.data.lastName,
      email,
      phone,
      comment: parsed.data.comment || null,
    })
    revalidatePath('/admin')
    revalidatePath('/mes-rendez-vous')
    return {
      ok: true,
      message: parsed.data.appointmentId
        ? 'Le rendez-vous a été mis à jour.'
        : 'Le rendez-vous a été créé.',
      appointmentId: appointment.id,
    }
  } catch (error) {
    if (error instanceof AdminAgendaError && error.code === 'OVERLAP')
      return {
        ok: false,
        message: 'Ce créneau chevauche déjà un rendez-vous confirmé.',
      }
    return { ok: false, message: 'Le rendez-vous n’a pas pu être enregistré.' }
  }
}

export const cancelAdminAppointment = async (
  appointmentId: string,
): Promise<AdminAppointmentResult> => {
  if (!(await requireAdminMutation()))
    return { ok: false, message: 'Votre session admin a expiré.' }
  const parsedId = z.string().min(1).safeParse(appointmentId)
  if (!parsedId.success)
    return { ok: false, message: 'Ce rendez-vous est invalide.' }
  try {
    await cancelAdminAppointmentSerializable(prisma, parsedId.data)
    revalidatePath('/admin')
    revalidatePath('/mes-rendez-vous')
    return { ok: true, message: 'Le rendez-vous a été annulé.' }
  } catch {
    return { ok: false, message: 'Ce rendez-vous ne peut plus être annulé.' }
  }
}

const refreshAvailability = () => {
  revalidatePath('/admin')
  revalidatePath('/admin/availability')
  revalidatePath('/reservation')
  // Les horaires d'ouverture affichés sur la page d'accueil viennent des
  // mêmes disponibilités hebdomadaires : elle doit être régénérée aussi.
  revalidatePath('/')
}

export const createWeeklyAvailability = async (
  formData: FormData,
): Promise<void> => {
  if (!(await requireAdminMutation())) redirect('/admin/login')
  const parsed = z
    .object({
      dayOfWeek: z.coerce.number().int().min(0).max(6),
      startTime: z.string().regex(timePattern),
      endTime: z.string().regex(timePattern),
    })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/admin/availability?error=invalid-range')

  const startMinute = parseMinute(parsed.data.startTime)
  const endMinute = parseMinute(parsed.data.endTime)
  if (startMinute >= endMinute)
    redirect('/admin/availability?error=invalid-range')
  const conflict = await prisma.weeklyAvailability.findFirst({
    where: {
      dayOfWeek: parsed.data.dayOfWeek,
      startMinute: { lt: endMinute },
      endMinute: { gt: startMinute },
    },
  })
  if (conflict) redirect('/admin/availability?error=overlap-range')
  await prisma.weeklyAvailability.create({
    data: { dayOfWeek: parsed.data.dayOfWeek, startMinute, endMinute },
  })
  refreshAvailability()
}

export const deleteWeeklyAvailability = async (
  formData: FormData,
): Promise<void> => {
  if (!(await requireAdminMutation())) redirect('/admin/login')
  const id = z.string().min(1).parse(formData.get('id'))
  await prisma.weeklyAvailability.delete({ where: { id } })
  refreshAvailability()
}

export const createAvailabilityException = async (
  formData: FormData,
): Promise<void> => {
  if (!(await requireAdminMutation())) redirect('/admin/login')
  const parsed = z
    .object({
      type: z.enum(['AVAILABLE', 'UNAVAILABLE']),
      date: z.string().refine(isDateKey),
      endDate: z.string().refine(isDateKey).optional(),
      startTime: z.string().regex(timePattern),
      endTime: z.string().regex(timePattern),
      label: z.string().trim().max(120).optional(),
    })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/admin/availability?error=invalid-exception')

  const startMinute = parseMinute(parsed.data.startTime)
  const endMinute = parseMinute(parsed.data.endTime)
  if (startMinute >= endMinute)
    redirect('/admin/availability?error=invalid-exception')

  let rows: ReturnType<typeof buildAvailabilityExceptionRows>
  try {
    rows = buildAvailabilityExceptionRows({
      type: parsed.data.type,
      startDateKey: parsed.data.date,
      endDateKey: parsed.data.endDate || parsed.data.date,
      startMinute,
      endMinute,
      label: parsed.data.label || null,
    })
  } catch {
    redirect('/admin/availability?error=invalid-exception')
  }
  if (rows.length > MAX_AVAILABILITY_EXCEPTION_RANGE_DAYS)
    redirect('/admin/availability?error=range-too-long')

  await prisma.availabilityException.createMany({ data: rows })
  refreshAvailability()
}

export const deleteAvailabilityException = async (
  formData: FormData,
): Promise<void> => {
  if (!(await requireAdminMutation())) redirect('/admin/login')
  const id = z.string().min(1).parse(formData.get('id'))
  await prisma.availabilityException.delete({ where: { id } })
  refreshAvailability()
}
