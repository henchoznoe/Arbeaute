import { formatInTimeZone } from 'date-fns-tz'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AppointmentForm } from '@/components/admin/appointment-form'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { getLocalDateKey, isDateKey } from '@/lib/reservation/time'

interface NewAppointmentPageProps {
  searchParams: Promise<{ date?: string }>
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
  const requestedDate = (await searchParams).date
  const now = new Date()
  const date =
    requestedDate && isDateKey(requestedDate)
      ? requestedDate
      : getLocalDateKey(now)
  const currentMinute =
    Number(formatInTimeZone(now, RESERVATION_TIME_ZONE, 'H')) * 60 +
    Number(formatInTimeZone(now, RESERVATION_TIME_ZONE, 'm'))
  const nextQuarter = Math.ceil((currentMinute + 1) / 15) * 15
  const time =
    date === getLocalDateKey(now) && nextQuarter < 24 * 60
      ? `${Math.floor(nextQuarter / 60)
          .toString()
          .padStart(2, '0')}:${(nextQuarter % 60).toString().padStart(2, '0')}`
      : '09:00'
  const services = await prisma.service.findMany({
    where: { isArchived: false },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      priceCents: true,
      category: { select: { name: true } },
    },
  })

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
        Seul le nom est obligatoire. Les créneaux hors horaires sont possibles
        après confirmation.
      </p>
      <div className="mt-7">
        <AppointmentForm services={services} appointment={{ date, time }} />
      </div>
    </main>
  )
}

export default NewAppointmentPage
