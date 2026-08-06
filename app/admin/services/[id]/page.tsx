import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ServiceForm } from '@/components/admin/service-form'
import { ServiceImageUpload } from '@/components/admin/service-image-upload'
import { updateService } from '@/lib/actions/catalog'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'

interface EditServicePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}

const EditServicePage = async ({
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
      <Link href="/admin/services" className="text-sm text-muted-foreground">
        ← Prestations
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl font-bold">{service.name}</h1>
        {saved ? (
          <p className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
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
      </div>
    </main>
  )
}

export default EditServicePage
