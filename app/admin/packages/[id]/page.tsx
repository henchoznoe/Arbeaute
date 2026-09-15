import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { PackageForm } from '@/components/admin/package-form'
import { PackageImageUpload } from '@/components/admin/package-image-upload'
import { StatusBadge } from '@/components/ui/status-badge'
import { togglePackageArchive, updatePackage } from '@/lib/actions/packages'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'

interface EditPackagePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}

const EditPackagePage = (props: Readonly<EditPackagePageProps>) => (
  <Suspense fallback={<AdminSkeleton variant="form" />}>
    <EditPackage {...props} />
  </Suspense>
)

const EditPackage = async ({
  params,
  searchParams,
}: Readonly<EditPackagePageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { id } = await params
  const [{ saved }, item, services] = await Promise.all([
    searchParams,
    prisma.package.findUnique({ where: { id }, include: { services: true } }),
    prisma.service.findMany({
      where: {
        isArchived: false,
        isBookable: true,
        isVisible: true,
        category: { isActive: true },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      select: { id: true, name: true, category: { select: { name: true } } },
    }),
  ])
  if (!item) notFound()
  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/packages"
        backLabel="Forfaits"
        title={item.name}
        aside={
          saved ? (
            <StatusBadge variant="success">Forfait enregistré</StatusBadge>
          ) : null
        }
      />
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
        <PackageForm action={updatePackage} services={services} item={item} />
        <div className="space-y-4">
          <PackageImageUpload packageId={item.id} imageUrl={item.imageUrl} />
          <form
            action={togglePackageArchive}
            className="rounded-2xl border bg-card p-5"
          >
            <input type="hidden" name="id" value={item.id} />
            <input
              type="hidden"
              name="archive"
              value={item.isArchived ? '0' : '1'}
            />
            <button type="submit" className="rounded-xl border px-4 py-2">
              {item.isArchived
                ? 'Remettre ce forfait'
                : 'Mettre ce forfait de côté'}
            </button>
          </form>
        </div>
      </div>
    </AdminPage>
  )
}

export default EditPackagePage
