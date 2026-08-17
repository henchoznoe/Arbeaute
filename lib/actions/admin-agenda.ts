'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod/v4'
import {
  AdminAgendaError,
  AdminAppointmentSeriesError,
  type AdminAppointmentSeriesPreview,
  buildAvailabilityExceptionRows,
  cancelAdminAppointmentSerializable,
  createAdminAppointmentSeriesSerializable,
  isAdminAppointmentInsidePublicHours,
  MAX_APPOINTMENT_SERIES_INTERVAL_WEEKS,
  MAX_APPOINTMENT_SERIES_OCCURRENCES,
  previewAdminAppointmentSeries as previewAppointmentSeries,
  saveAdminAppointmentSerializable,
} from '@/lib/admin/agenda'
import { runAuditedMutation } from '@/lib/admin/audit'
import {
  AdminAvailabilityExceptionError,
  createAvailabilityExceptionGroupSerializable,
  deleteAvailabilityExceptionGroupAudited,
} from '@/lib/admin/availability-exceptions'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { MAX_AVAILABILITY_EXCEPTION_RANGE_DAYS } from '@/lib/reservation/constants'
import { normalizeCustomerSearchName } from '@/lib/reservation/customers'
import { normalizeEmail, normalizePhone } from '@/lib/reservation/identity'
import { OPENING_HOURS_TAG } from '@/lib/reservation/opening-hours'
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
  // Obligatoires depuis la v2 : un rendez-vous sans coordonnées ne peut ni être
  // confirmé par e-mail, ni être retrouvé par la personne concernée.
  email: z.string().trim().min(1).max(254),
  phone: z.string().trim().min(1).max(40),
  comment: z.string().trim().max(1000).optional(),
  acknowledgeOutsideHours: z.boolean().optional(),
})

const appointmentSeriesSchema = appointmentSchema
  .omit({ appointmentId: true })
  .extend({
    occurrenceCount: z
      .number()
      .int()
      .min(2)
      .max(MAX_APPOINTMENT_SERIES_OCCURRENCES),
    intervalWeeks: z
      .number()
      .int()
      .min(1)
      .max(MAX_APPOINTMENT_SERIES_INTERVAL_WEEKS),
  })

const requireAdminMutation = async (): Promise<boolean> =>
  Boolean((await getAdminSession()) && (await hasSameOrigin()))

const parseMinute = (value: string): number => {
  const [, hours, minutes] = timePattern.exec(value) ?? []
  return Number(hours) * 60 + Number(minutes)
}

const countDateKeys = (startDateKey: string, endDateKey: string): number =>
  Math.round(
    (Date.parse(`${endDateKey}T00:00:00.000Z`) -
      Date.parse(`${startDateKey}T00:00:00.000Z`)) /
      (24 * 60 * 60 * 1000),
  ) + 1

export interface AdminAppointmentFormInput {
  appointmentId?: string
  serviceId: string
  date: string
  time: string
  firstName?: string
  lastName: string
  email: string
  phone: string
  comment?: string
  acknowledgeOutsideHours?: boolean
}

export interface AdminAppointmentResult {
  ok: boolean
  message: string
  appointmentId?: string
  needsOutsideHoursConfirmation?: boolean
}

export interface AdminAppointmentSeriesFormInput
  extends Omit<AdminAppointmentFormInput, 'appointmentId'> {
  occurrenceCount: number
  intervalWeeks: number
}

export interface AdminAppointmentSeriesResult extends AdminAppointmentResult {
  preview?: AdminAppointmentSeriesPreview
}

export interface AdminCustomerOption {
  id: string
  firstName: string | null
  lastName: string
  email: string
  phone: string
}

export interface AdminCustomerSearchResult {
  ok: boolean
  message: string
  customers: AdminCustomerOption[]
}

/** Le cas de loin le plus fréquent : les deux coordonnées sont vides. */
const isMissingContactDetails = (error: z.ZodError): boolean =>
  error.issues.some(issue => {
    const field = String(issue.path[0])
    return field === 'email' || field === 'phone'
  })

const normalizeAppointmentIdentity = (data: {
  email: string
  phone: string
}): { email: string; phone: string } => ({
  email: normalizeEmail(data.email),
  phone: normalizePhone(data.phone),
})

const toAppointmentSeriesInput = (
  data: z.infer<typeof appointmentSeriesSchema>,
) => {
  const identity = normalizeAppointmentIdentity(data)
  return {
    serviceId: data.serviceId,
    date: data.date,
    minute: parseMinute(data.time),
    occurrenceCount: data.occurrenceCount,
    intervalWeeks: data.intervalWeeks,
    firstName: data.firstName || null,
    lastName: data.lastName,
    ...identity,
    comment: data.comment || null,
    acknowledgeOutsideHours: data.acknowledgeOutsideHours,
  }
}

export const searchAdminCustomers = async (
  input: unknown,
): Promise<AdminCustomerSearchResult> => {
  if (!(await requireAdminMutation()))
    return {
      ok: false,
      message: 'Votre session a expiré. Reconnectez-vous, puis recommencez.',
      customers: [],
    }
  const parsed = z.string().trim().min(2).max(100).safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      message: 'Saisissez au moins deux lettres pour lancer la recherche.',
      customers: [],
    }
  const query = parsed.data
  const phoneDigits = query.replace(/\D/g, '')
  try {
    const customers = await prisma.customer.findMany({
      where: {
        anonymizedAt: null,
        OR: [
          {
            searchName: {
              contains: normalizeCustomerSearchName(null, query),
            },
          },
          { emailNormalized: { contains: query.toLowerCase() } },
          ...(phoneDigits.length >= 2
            ? [{ phoneNormalized: { contains: phoneDigits } }]
            : []),
        ],
      },
      orderBy: [{ lastSeenAt: 'desc' }, { id: 'asc' }],
      take: 8,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    })
    return {
      ok: true,
      message: customers.length
        ? `${customers.length} fiche${customers.length > 1 ? 's' : ''} trouvée${customers.length > 1 ? 's' : ''}.`
        : 'Aucune fiche trouvée.',
      customers,
    }
  } catch {
    return {
      ok: false,
      message:
        'La recherche ne répond pas pour le moment. Réessayez dans un instant.',
      customers: [],
    }
  }
}

export const previewAdminAppointmentSeries = async (
  input: AdminAppointmentSeriesFormInput,
): Promise<AdminAppointmentSeriesResult> => {
  if (!(await requireAdminMutation()))
    return {
      ok: false,
      message: 'Votre session a expiré. Reconnectez-vous, puis recommencez.',
    }
  const parsed = appointmentSeriesSchema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      message:
        'Les informations de la répétition sont incomplètes. Vérifiez le nombre de rendez-vous et le rythme choisi.',
    }
  if (parseMinute(parsed.data.time) % 15 !== 0)
    return {
      ok: false,
      message:
        'L’heure doit tomber sur un quart d’heure : 9:00, 9:15, 9:30 ou 9:45.',
    }
  try {
    const preview = await previewAppointmentSeries(
      prisma,
      toAppointmentSeriesInput(parsed.data),
    )
    return {
      ok: true,
      message: preview.conflictCount
        ? `${preview.conflictCount} occurrence${preview.conflictCount > 1 ? 's sont en conflit.' : ' est en conflit.'}`
        : `${preview.occurrences.length} occurrences vérifiées.`,
      preview,
    }
  } catch {
    return {
      ok: false,
      message:
        'Les dates n’ont pas pu être calculées. Vérifiez la date de départ, puis réessayez.',
    }
  }
}

export const createAdminAppointmentSeries = async (
  input: AdminAppointmentSeriesFormInput,
): Promise<AdminAppointmentSeriesResult> => {
  if (!(await requireAdminMutation()))
    return {
      ok: false,
      message: 'Votre session a expiré. Reconnectez-vous, puis recommencez.',
    }
  const parsed = appointmentSeriesSchema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      message:
        'Les informations de la répétition sont incomplètes. Vérifiez le nombre de rendez-vous et le rythme choisi.',
    }
  if (parseMinute(parsed.data.time) % 15 !== 0)
    return {
      ok: false,
      message:
        'L’heure doit tomber sur un quart d’heure : 9:00, 9:15, 9:30 ou 9:45.',
    }
  try {
    const appointments = await createAdminAppointmentSeriesSerializable(
      prisma,
      toAppointmentSeriesInput(parsed.data),
    )
    revalidatePath('/admin')
    revalidatePath('/mes-rendez-vous')
    return {
      ok: true,
      message: `${appointments.length} rendez-vous ont été créés.`,
    }
  } catch (error) {
    if (error instanceof AdminAppointmentSeriesError)
      return {
        ok: false,
        message:
          error.code === 'CONFLICT'
            ? 'La répétition a changé : au moins une date se superpose à un autre rendez-vous. Relancez la vérification.'
            : 'Confirmez la création des rendez-vous placés hors ouverture.',
        preview: error.preview,
        needsOutsideHoursConfirmation: error.code === 'OUTSIDE_HOURS',
      }
    return {
      ok: false,
      message:
        'Aucun rendez-vous n’a été créé. Corrigez les dates signalées, puis relancez la vérification.',
    }
  }
}

export const saveAdminAppointment = async (
  input: AdminAppointmentFormInput,
): Promise<AdminAppointmentResult> => {
  if (!(await requireAdminMutation()))
    return {
      ok: false,
      message: 'Votre session a expiré. Reconnectez-vous, puis recommencez.',
    }
  const parsed = appointmentSchema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      message: isMissingContactDetails(parsed.error)
        ? 'Indiquez l’e-mail et le téléphone : ils servent à envoyer la confirmation et à retrouver le rendez-vous.'
        : 'Certaines informations sont incomplètes ou mal formées. Corrigez les champs signalés, puis réessayez.',
    }

  const minute = parseMinute(parsed.data.time)
  if (minute % 15 !== 0)
    return {
      ok: false,
      message:
        'L’heure doit tomber sur un quart d’heure : 9:00, 9:15, 9:30 ou 9:45.',
    }

  let email: string
  let phone: string
  try {
    email = normalizeEmail(parsed.data.email)
    phone = normalizePhone(parsed.data.phone)
  } catch {
    return {
      ok: false,
      message:
        'L’adresse e-mail ou le numéro de téléphone n’est pas au bon format. Corrigez-les, puis réessayez.',
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
          'Ce rendez-vous tombe hors ouverture, ou se superpose à une fermeture. Choisissez une autre heure, ou ouvrez ce jour dans « Jours particuliers ».',
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
        message:
          'Cette heure est déjà prise, temps d’installation et de rangement compris. Choisissez une autre heure.',
      }
    return {
      ok: false,
      message:
        'Le rendez-vous n’a pas pu être enregistré. Réessayez ; si cela recommence, notez l’heure et prévenez Noé.',
    }
  }
}

export const cancelAdminAppointment = async (
  appointmentId: string,
): Promise<AdminAppointmentResult> => {
  if (!(await requireAdminMutation()))
    return {
      ok: false,
      message: 'Votre session a expiré. Reconnectez-vous, puis recommencez.',
    }
  const parsedId = z.string().min(1).safeParse(appointmentId)
  if (!parsedId.success)
    return {
      ok: false,
      message:
        'Ce rendez-vous n’existe plus. Revenez à l’agenda et rouvrez-le.',
    }
  try {
    await cancelAdminAppointmentSerializable(prisma, parsedId.data)
    revalidatePath('/admin')
    revalidatePath('/mes-rendez-vous')
    return { ok: true, message: 'Le rendez-vous a été annulé.' }
  } catch {
    return {
      ok: false,
      message:
        'Ce rendez-vous n’est plus actif : il a déjà été annulé ou terminé.',
    }
  }
}

const refreshAvailability = () => {
  revalidatePath('/admin')
  revalidatePath('/admin/availability')
  revalidatePath('/reservation')
  revalidatePath('/')
  // Les horaires d'ouverture affichés sur la page d'accueil et dans le JSON-LD
  // viennent des mêmes disponibilités hebdomadaires. `updateTag` les expire
  // sans attendre : Arzu voit sa modification dès le rechargement.
  updateTag(OPENING_HOURS_TAG)
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
  await runAuditedMutation(
    prisma,
    transaction =>
      transaction.weeklyAvailability.create({
        data: { dayOfWeek: parsed.data.dayOfWeek, startMinute, endMinute },
      }),
    created => ({
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'WEEKLY_AVAILABILITY',
      entityId: created.id,
      entityLabel: `Jour ${created.dayOfWeek}`,
      action: 'CREATED',
      after: { dayOfWeek: created.dayOfWeek, startMinute, endMinute },
    }),
  )
  refreshAvailability()
}

export const deleteWeeklyAvailability = async (
  formData: FormData,
): Promise<void> => {
  if (!(await requireAdminMutation())) redirect('/admin/login')
  const id = z.string().min(1).parse(formData.get('id'))
  await runAuditedMutation(
    prisma,
    transaction => transaction.weeklyAvailability.delete({ where: { id } }),
    deleted => ({
      actorType: 'ADMIN',
      actorId: 'admin',
      entityType: 'WEEKLY_AVAILABILITY',
      entityId: deleted.id,
      entityLabel: `Jour ${deleted.dayOfWeek}`,
      action: 'DELETED',
      before: {
        dayOfWeek: deleted.dayOfWeek,
        startMinute: deleted.startMinute,
        endMinute: deleted.endMinute,
      },
    }),
  )
  refreshAvailability()
}

export const createAvailabilityException = async (
  formData: FormData,
): Promise<void> => {
  if (!(await requireAdminMutation())) redirect('/admin/login')
  const optionalDate = z.preprocess(
    value => (value === '' ? undefined : value),
    z.string().refine(isDateKey).optional(),
  )
  const optionalTime = z.preprocess(
    value => (value === '' ? undefined : value),
    z.string().regex(timePattern).optional(),
  )
  const parsed = z
    .object({
      type: z.enum(['AVAILABLE', 'UNAVAILABLE']),
      date: z.string().refine(isDateKey),
      endDate: optionalDate,
      startTime: optionalTime,
      endTime: optionalTime,
      label: z.string().trim().max(120).optional(),
      shortcut: z
        .enum(['CUSTOM', 'ALL_DAY', 'COPY_WEEKLY', 'VACATION'])
        .default('CUSTOM'),
      copyDayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/admin/availability?error=invalid-exception')

  const groupId = randomUUID()
  const label =
    parsed.data.label ||
    (parsed.data.shortcut === 'VACATION' ? 'Vacances' : null)
  let rows: ReturnType<typeof buildAvailabilityExceptionRows> = []
  if (parsed.data.shortcut === 'COPY_WEEKLY') {
    if (parsed.data.copyDayOfWeek === undefined)
      redirect('/admin/availability?error=invalid-exception')
    const copiedRanges = await prisma.weeklyAvailability.findMany({
      where: { dayOfWeek: parsed.data.copyDayOfWeek },
      orderBy: { startMinute: 'asc' },
    })
    if (!copiedRanges.length)
      redirect('/admin/availability?error=invalid-exception')
    rows = copiedRanges.map(range => ({
      type: 'AVAILABLE' as const,
      startsAt: localDateMinuteToUtc(parsed.data.date, range.startMinute),
      endsAt: localDateMinuteToUtc(parsed.data.date, range.endMinute),
      label: label || 'Horaires copiés',
    }))
  } else {
    const allDay =
      parsed.data.shortcut === 'ALL_DAY' || parsed.data.shortcut === 'VACATION'
    if (!allDay && (!parsed.data.startTime || !parsed.data.endTime))
      redirect('/admin/availability?error=invalid-exception')
    const dayCount = countDateKeys(
      parsed.data.date,
      parsed.data.endDate || parsed.data.date,
    )
    if (dayCount < 1) redirect('/admin/availability?error=invalid-exception')
    if (dayCount > MAX_AVAILABILITY_EXCEPTION_RANGE_DAYS)
      redirect('/admin/availability?error=range-too-long')
    const startMinute = allDay
      ? 0
      : parseMinute(parsed.data.startTime as string)
    const endMinute = allDay
      ? 24 * 60
      : parseMinute(parsed.data.endTime as string)
    if (startMinute >= endMinute)
      redirect('/admin/availability?error=invalid-exception')
    try {
      rows = buildAvailabilityExceptionRows({
        type:
          parsed.data.shortcut === 'VACATION'
            ? 'UNAVAILABLE'
            : parsed.data.type,
        startDateKey: parsed.data.date,
        endDateKey: parsed.data.endDate || parsed.data.date,
        startMinute,
        endMinute,
        label,
      })
    } catch {
      redirect('/admin/availability?error=invalid-exception')
    }
  }
  if (rows.length > MAX_AVAILABILITY_EXCEPTION_RANGE_DAYS)
    redirect('/admin/availability?error=range-too-long')

  try {
    await createAvailabilityExceptionGroupSerializable(prisma, {
      groupId,
      rows,
      label,
    })
  } catch (error) {
    if (
      error instanceof AdminAvailabilityExceptionError &&
      error.code === 'OVERLAP'
    )
      redirect('/admin/availability?error=overlap-exception')
    throw error
  }
  refreshAvailability()
}

export const deleteAvailabilityExceptionGroup = async (
  groupId: string,
): Promise<{ ok: boolean; message: string }> => {
  if (!(await requireAdminMutation()))
    return {
      ok: false,
      message: 'Votre session a expiré. Reconnectez-vous, puis recommencez.',
    }
  const parsed = z.string().min(1).safeParse(groupId)
  if (!parsed.success)
    return {
      ok: false,
      message:
        'Cette période n’est pas valable. Vérifiez les deux dates, puis réessayez.',
    }
  try {
    const deletedCount = await deleteAvailabilityExceptionGroupAudited(
      prisma,
      parsed.data,
    )
    refreshAvailability()
    return {
      ok: true,
      message: `${deletedCount} exception${deletedCount > 1 ? 's supprimées' : ' supprimée'}.`,
    }
  } catch {
    return {
      ok: false,
      message:
        'Cette période a déjà été supprimée. Rafraîchissez la page pour voir l’état actuel.',
    }
  }
}
