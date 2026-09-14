import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { PackageForm } from '@/components/admin/package-form'
import { createPackage } from '@/lib/actions/packages'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'

const NewPackagePage = () => (
  <Suspense fallback={<AdminSkeleton variant="form" />}>
    <NewPackage />
  </Suspense>
)

const NewPackage = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const services = await prisma.service.findMany({
    where: { isArchived: false, isBookable: true },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    select: { id: true, name: true, category: { select: { name: true } } },
  })
  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/packages"
        backLabel="Forfaits"
        title="Nouveau forfait"
      />
      <div className="mt-6">
        <PackageForm action={createPackage} services={services} />
      </div>
    </AdminPage>
  )
}

export default NewPackagePage
