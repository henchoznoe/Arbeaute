import { formatInTimeZone } from 'date-fns-tz'
import { CalendarPlus } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { AppointmentForm } from '@/components/admin/appointment-form'
import { isAdminAppointmentTime } from '@/lib/admin/agenda-timeline'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import {
  getPackageCreditSummary,
  getPackageExpiry,
} from '@/lib/packages/domain'
import { RESERVATION_TIME_ZONE } from '@/lib/reservation/constants'
import { getLocalDateKey, isDateKey } from '@/lib/reservation/time'

interface NewAppointmentPageProps {
  searchParams: Promise<{
    date?: string
    time?: string
    duplicate?: string
    customerId?: string
    customerPackageId?: string
  }>
}

const NewAppointmentPage = ({
  searchParams,
}: Readonly<NewAppointmentPageProps>) => (
  <Suspense fallback={<AdminSkeleton variant="form" />}>
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
    customerPackageId,
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
  const [allServices, duplicate, customer, customerPackage] = await Promise.all(
    [
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
      customerPackageId
        ? prisma.customerPackage.findFirst({
            where: { id: customerPackageId, status: 'ACTIVE' },
            include: {
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
              sessions: { select: { creditState: true } },
              allowedServices: {
                orderBy: { service: { name: 'asc' } },
                select: {
                  service: {
                    select: {
                      id: true,
                      name: true,
                      durationMinutes: true,
                      priceCents: true,
                      isArchived: true,
                      category: { select: { name: true } },
                    },
                  },
                },
              },
            },
          })
        : null,
    ],
  )
  if (customerPackageId && !customerPackage) notFound()
  const packageCredits = customerPackage
    ? getPackageCreditSummary(
        customerPackage.sessionCountSnapshot,
        customerPackage.sessions,
      )
    : null
  const packageExpiry = customerPackage
    ? getPackageExpiry({
        validityStartsAt: customerPackage.validityStartsAt,
        validityMonths: customerPackage.validityMonthsSnapshot,
        expiresAtOverride: customerPackage.expiresAtOverride,
      })
    : null
  if (
    customerPackage &&
    (packageCredits?.remaining === 0 ||
      (packageExpiry !== null && packageExpiry <= now))
  )
    notFound()
  const services = customerPackage
    ? customerPackage.allowedServices
        .map(item => item.service)
        .map(service => ({
          ...service,
          name: service.isArchived
            ? `${service.name} — retiré du catalogue`
            : service.name,
        }))
    : allServices
  const prefilledCustomer = customerPackage
    ? customerPackage.customer
    : duplicate
      ? {
          firstName: duplicate.customerFirstName,
          lastName: duplicate.customerLastName,
          email: duplicate.customerEmail,
          phone: duplicate.customerPhone,
        }
      : customer

  return (
    <AdminPage>
      <AdminPageHeader
        backHref={
          customerPackage
            ? `/admin/customer-packages/${customerPackage.id}`
            : `/admin?date=${date}`
        }
        backLabel={customerPackage ? 'Forfait' : 'Agenda'}
        eyebrow="Arbeauté"
        title="Nouveau rendez-vous"
        icon={CalendarPlus}
        description={
          customerPackage
            ? `Planifiez une ou plusieurs séances incluses dans ${customerPackage.packageNameSnapshot}.`
            : duplicate
              ? 'Le soin et le client sont repris. Choisissez une nouvelle heure.'
              : customer
                ? 'Le client est repris. Choisissez le soin et l’heure.'
                : 'Choisissez le soin, l’heure et le client.'
        }
      />
      <div className="mt-4">
        <AppointmentForm
          key={`new-${duplicateId ?? customerId ?? customerPackageId ?? 'empty'}-${date}-${time}`}
          services={services}
          appointment={{
            serviceId:
              duplicate?.serviceId ??
              (services.length === 1 ? services[0]?.id : undefined),
            customerPackageId: customerPackage?.id,
            packageName: customerPackage?.packageNameSnapshot,
            remainingPackageCredits: packageCredits?.remaining,
            date,
            time,
            firstName: prefilledCustomer?.firstName,
            lastName: prefilledCustomer?.lastName,
            email: prefilledCustomer?.email,
            phone: prefilledCustomer?.phone,
          }}
        />
      </div>
    </AdminPage>
  )
}

export default NewAppointmentPage
