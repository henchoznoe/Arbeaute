import { Settings2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { ServiceCatalogManager } from '@/components/admin/service-catalog-manager'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'

const AdminServicesPage = () => (
  <Suspense fallback={<AdminSkeleton variant="list" />}>
    <AdminServices />
  </Suspense>
)

const AdminServices = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const categories = await prisma.serviceCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      isActive: true,
      services: {
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          durationMinutes: true,
          priceCents: true,
          color: true,
          isVisible: true,
          isBookable: true,
          isArchived: true,
        },
      },
    },
  })

  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/settings"
        backLabel="Réglages"
        title="Prestations"
        icon={Settings2}
        description="Recherchez un soin ou ouvrez un groupe."
      />
      <ServiceCatalogManager categories={categories} />
    </AdminPage>
  )
}

export default AdminServicesPage
