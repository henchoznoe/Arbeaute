import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { ServiceConsentUpload } from '@/components/admin/service-consent-upload'
import { ServiceForm } from '@/components/admin/service-form'
import { ServiceImageUpload } from '@/components/admin/service-image-upload'
import { Button } from '@/components/ui/button'
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
  <Suspense fallback={<AdminSkeleton variant="form" maxWidth="max-w-5xl" />}>
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
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
      >
        <Link href="/admin/services">
          <ChevronLeft className="size-4" /> Prestations
        </Link>
      </Button>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-title font-bold">{service.name}</h1>
        {saved ? (
          <p className="rounded-full bg-success-subtle px-3 py-1 text-sm text-success">
            Modifications enregistrées
          </p>
        ) : null}
      </div>
      <div className="mt-8 space-y-6">
        <ServiceForm
          action={updateService}
          categories={categories}
          service={service}
          submitLabel="Enregistrer"
        />
        <ServiceImageUpload
          serviceId={service.id}
          imageUrl={service.imageUrl}
        />
        <ServiceConsentUpload
          serviceId={service.id}
          consentFormUrl={service.consentFormUrl}
        />
      </div>
    </main>
  )
}

export default EditServicePage
