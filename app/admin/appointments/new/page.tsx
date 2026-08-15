import { formatInTimeZone } from 'date-fns-tz'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AppointmentForm } from '@/components/admin/appointment-form'
import { isAdminAppointmentTime } from '@/lib/admin/agenda-timeline'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { getLocalDateKey, isDateKey } from '@/lib/reservation/time'

interface NewAppointmentPageProps {
  searchParams: Promise<{ date?: string; time?: string; duplicate?: string }>
}

const NewAppointmentPage = ({
  searchParams,
}: Readonly<NewAppointmentPageProps>) => (
  <Suspense fallback={<AdminSkeleton maxWidth="max-w-3xl" />}>
    <NewAppointment searchParams={searchParams} />
  </Suspense>
)

const NewAppointment = async ({
  searchParams,
}: Readonly<NewAppointmentPageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const {
    date: requestedDate,
    time: requestedTime,
    duplicate: duplicateId,
  } = await searchParams
  const now = new Date()
  const date =
    requestedDate && isDateKey(requestedDate)
      ? requestedDate
      : getLocalDateKey(now)
  const currentMinute =
    Number(formatInTimeZone(now, RESERVATION_TIME_ZONE, 'H')) * 60 +
    Number(formatInTimeZone(now, RESERVATION_TIME_ZONE, 'm'))
  const nextQuarter = Math.ceil((currentMinute + 1) / 15) * 15
  const fallbackTime =
    date === getLocalDateKey(now) && nextQuarter < 24 * 60
      ? `${Math.floor(nextQuarter / 60)
          .toString()
          .padStart(2, '0')}:${(nextQuarter % 60).toString().padStart(2, '0')}`
      : '09:00'
  const time =
    requestedTime && isAdminAppointmentTime(requestedTime)
      ? requestedTime
      : fallbackTime
  const [services, duplicate] = await Promise.all([
    prisma.service.findMany({
      where: { isArchived: false },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        priceCents: true,
        category: { select: { name: true } },
      },
    }),
    duplicateId
      ? prisma.appointment.findFirst({
          where: { id: duplicateId, status: 'CONFIRMED' },
          select: {
            serviceId: true,
            customerFirstName: true,
            customerLastName: true,
            customerEmail: true,
            customerPhone: true,
          },
        })
      : null,
  ])

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-8">
      <Link
        href={`/admin?date=${date}`}
        className="inline-flex min-h-11 items-center text-sm text-muted-foreground"
      >
        ← Agenda
      </Link>
      <h1 className="mt-2 font-heading text-3xl font-bold">
        Nouveau rendez-vous
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {duplicate
          ? 'Le soin et les coordonnées ont été repris. Choisissez un nouveau créneau avant de créer le rendez-vous.'
          : 'Seul le nom est obligatoire. Les créneaux hors horaires sont possibles après confirmation.'}
      </p>
      <div className="mt-7">
        <AppointmentForm
          key={`new-${duplicateId ?? 'empty'}-${date}-${time}`}
          services={services}
          appointment={{
            serviceId: duplicate?.serviceId,
            date,
            time,
            firstName: duplicate?.customerFirstName,
            lastName: duplicate?.customerLastName,
            email: duplicate?.customerEmail,
            phone: duplicate?.customerPhone,
          }}
        />
      </div>
    </main>
  )
}

export default NewAppointmentPage
