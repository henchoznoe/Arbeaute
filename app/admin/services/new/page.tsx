import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { ServiceForm } from '@/components/admin/service-form'
import { createService } from '@/lib/actions/catalog'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'

const NewServicePage = () => (
  <Suspense fallback={<AdminSkeleton variant="form" />}>
    <NewService />
  </Suspense>
)

const NewService = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true },
  })

  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/services"
        backLabel="Prestations"
        eyebrow="Arbeauté"
        title="Nouvelle prestation"
      />
      <div className="mt-6">
        <ServiceForm
          action={createService}
          categories={categories}
          submitLabel="Créer la prestation"
        />
      </div>
    </AdminPage>
  )
}

export default NewServicePage
