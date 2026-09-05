import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { getAdminSession } from '@/lib/core/session-cookies'

const LegacyActivity = async ({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>
}) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { entity } = await searchParams
  const topic =
    entity === 'APPOINTMENT'
      ? 'appointments'
      : entity === 'APPOINTMENT_REQUEST'
        ? 'requests'
        : entity === 'CUSTOMER'
          ? 'customers'
          : entity === 'SERVICE' || entity === 'SERVICE_CATEGORY'
            ? 'services'
            : entity &&
                [
                  'WEEKLY_AVAILABILITY',
                  'AVAILABILITY_EXCEPTION',
                  'BOOKING_SETTINGS',
                  'AGENDA_SETTINGS',
                ].includes(entity)
              ? 'settings'
              : 'all'
  redirect(`/admin/activity?topic=${topic}`)
}
export default function LegacyActivityPage(props: {
  searchParams: Promise<{ entity?: string }>
}) {
  return (
    <Suspense fallback={<AdminSkeleton variant="list" />}>
      <LegacyActivity {...props} />
    </Suspense>
  )
}
