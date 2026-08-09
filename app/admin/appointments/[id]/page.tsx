import { formatInTimeZone } from 'date-fns-tz'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AppointmentForm } from '@/components/admin/appointment-form'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'

interface EditAppointmentPageProps {
  params: Promise<{ id: string }>
}

const EditAppointmentPage = ({
  params,
}: Readonly<EditAppointmentPageProps>) => (
  <Suspense fallback={<AdminSkeleton maxWidth="max-w-3xl" />}>
    <EditAppointment params={params} />
  </Suspense>
)

const EditAppointment = async ({
  params,
}: Readonly<EditAppointmentPageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { id } = await params
  const [appointment, services] = await Promise.all([
    prisma.appointment.findFirst({
      where: { id, status: 'CONFIRMED' },
    }),
    prisma.service.findMany({
      where: { OR: [{ isArchived: false }, { id }] },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        priceCents: true,
        category: { select: { name: true } },
      },
    }),
  ])
  if (!appointment) notFound()

  const date = formatInTimeZone(
    appointment.startsAt,
    RESERVATION_TIME_ZONE,
    'yyyy-MM-dd',
  )
  const time = formatInTimeZone(
    appointment.startsAt,
    RESERVATION_TIME_ZONE,
    'HH:mm',
  )

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-8">
      <Link
        href={`/admin?date=${date}`}
        className="inline-flex min-h-11 items-center text-sm text-muted-foreground"
      >
        ← Agenda
      </Link>
      <h1 className="mt-2 font-heading text-3xl font-bold">
        Modifier le rendez-vous
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Le changement de prestation actualise la durée et le prix conservés sur
        ce rendez-vous.
      </p>
      <div className="mt-7">
        <AppointmentForm
          services={services}
          appointment={{
            id: appointment.id,
            serviceId: appointment.serviceId,
            date,
            time,
            firstName: appointment.customerFirstName,
            lastName: appointment.customerLastName,
            email: appointment.customerEmail,
            phone: appointment.customerPhone,
            comment: appointment.comment,
          }}
        />
      </div>
    </main>
  )
}

export default EditAppointmentPage
