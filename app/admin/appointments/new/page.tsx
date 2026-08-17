import { formatInTimeZone } from 'date-fns-tz'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AppointmentForm } from '@/components/admin/appointment-form'
import { Button } from '@/components/ui/button'
import { isAdminAppointmentTime } from '@/lib/admin/agenda-timeline'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { getLocalDateKey, isDateKey } from '@/lib/reservation/time'

interface NewAppointmentPageProps {
  searchParams: Promise<{
    date?: string
    time?: string
    duplicate?: string
    customerId?: string
  }>
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
    customerId,
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
  const [services, duplicate, customer] = await Promise.all([
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
          where: { id: duplicateId },
          select: {
            serviceId: true,
            customerFirstName: true,
            customerLastName: true,
            customerEmail: true,
            customerPhone: true,
          },
        })
      : null,
    customerId
      ? prisma.customer.findFirst({
          where: { id: customerId, anonymizedAt: null },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        })
      : null,
  ])
  const prefilledCustomer = duplicate
    ? {
        firstName: duplicate.customerFirstName,
        lastName: duplicate.customerLastName,
        email: duplicate.customerEmail,
        phone: duplicate.customerPhone,
      }
    : customer

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
      >
        <Link href={`/admin?date=${date}`}>
          <ChevronLeft className="size-4" /> Agenda
        </Link>
      </Button>
      <h1 className="mt-2 font-heading text-title font-bold">
        Nouveau rendez-vous
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {duplicate
          ? 'Le soin et les coordonnées ont été repris. Choisissez un nouveau créneau avant de créer le rendez-vous.'
          : customer
            ? 'Les coordonnées de la cliente ont été reprises. Choisissez le soin et le créneau.'
            : 'Seul le nom est obligatoire. Les heures hors ouverture sont possibles après confirmation.'}
      </p>
      <div className="mt-7">
        <AppointmentForm
          key={`new-${duplicateId ?? customerId ?? 'empty'}-${date}-${time}`}
          services={services}
          appointment={{
            serviceId: duplicate?.serviceId,
            date,
            time,
            firstName: prefilledCustomer?.firstName,
            lastName: prefilledCustomer?.lastName,
            email: prefilledCustomer?.email,
            phone: prefilledCustomer?.phone,
          }}
        />
      </div>
    </main>
  )
}

export default NewAppointmentPage
