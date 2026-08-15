import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { ServiceForm } from '@/components/admin/service-form'
import { Button } from '@/components/ui/button'
import { createService } from '@/lib/actions/catalog'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'

const NewServicePage = () => (
  <Suspense fallback={<AdminSkeleton maxWidth="max-w-5xl" />}>
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
      <h1 className="mt-3 font-heading text-title font-bold">
        Nouvelle prestation
      </h1>
      <div className="mt-8">
        <ServiceForm
          action={createService}
          categories={categories}
          submitLabel="Créer la prestation"
        />
      </div>
    </main>
  )
}

export default NewServicePage
