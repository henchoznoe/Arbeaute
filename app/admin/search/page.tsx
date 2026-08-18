import { Search } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSearchTabs } from '@/components/admin/admin-search-tabs'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { getAdminCustomerSearchPage } from '@/lib/admin/customer-search'
import { getAdminSearchPage, getAdminSearchServices } from '@/lib/admin/search'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'

const AdminSearchPage = () => (
  <Suspense fallback={<AdminSkeleton variant="list" />}>
    <SearchAppointments />
  </Suspense>
)

const SearchAppointments = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const [services, initialAppointments, initialCustomers] = await Promise.all([
    getAdminSearchServices(prisma),
    getAdminSearchPage(prisma, { query: '', page: 1 }),
    getAdminCustomerSearchPage(prisma, { query: '', page: 1 }),
  ])

  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin"
        backLabel="Agenda"
        eyebrow="Arbeauté"
        title="Rechercher"
        icon={Search}
        description="Retrouvez quelqu’un par son nom, son adresse ou son numéro — ou un rendez-vous précis. Rien de ce que vous tapez n’apparaît dans l’adresse de la page."
      />
      <AdminSearchTabs
        services={services}
        initialAppointments={initialAppointments}
        initialCustomers={initialCustomers}
      />
    </AdminPage>
  )
}

export default AdminSearchPage
