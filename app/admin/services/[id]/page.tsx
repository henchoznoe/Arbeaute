import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { ServiceConsentUpload } from '@/components/admin/service-consent-upload'
import { ServiceForm } from '@/components/admin/service-form'
import { ServiceImageUpload } from '@/components/admin/service-image-upload'
import { StatusBadge } from '@/components/ui/status-badge'
import { updateService } from '@/lib/actions/catalog'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'

interface EditServicePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}

const EditServicePage = ({
  params,
  searchParams,
}: Readonly<EditServicePageProps>) => (
  <Suspense fallback={<AdminSkeleton variant="form" />}>
    <EditService params={params} searchParams={searchParams} />
  </Suspense>
)

const EditService = async ({
  params,
  searchParams,
}: Readonly<EditServicePageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { id } = await params
  const [{ saved }, service, categories] = await Promise.all([
    searchParams,
    prisma.service.findUnique({ where: { id } }),
    prisma.serviceCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    }),
  ])
  if (!service) notFound()

  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/services"
        backLabel="Prestations"
        eyebrow="Arbeauté"
        title={service.name}
        aside={
          saved ? (
            <StatusBadge variant="success">
              Modifications enregistrées
            </StatusBadge>
          ) : null
        }
      />
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ServiceForm
          action={updateService}
          categories={categories}
          service={service}
          submitLabel="Enregistrer"
        />
        <div className="min-w-0 space-y-6">
          <ServiceImageUpload
            serviceId={service.id}
            imageUrl={service.imageUrl}
          />
          <ServiceConsentUpload
            serviceId={service.id}
            consentFormUrl={service.consentFormUrl}
          />
        </div>
      </div>
    </AdminPage>
  )
}

export default EditServicePage
