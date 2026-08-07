import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ServiceForm } from '@/components/admin/service-form'
import { createService } from '@/lib/actions/catalog'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'

const NewServicePage = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true },
  })

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-8">
      <Link href="/admin/services" className="text-sm text-muted-foreground">
        ← Prestations
      </Link>
      <h1 className="mt-3 font-heading text-3xl font-bold">
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
