import { ChevronLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSearchTabs } from '@/components/admin/admin-search-tabs'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { Button } from '@/components/ui/button'
import { getAdminCustomerSearchPage } from '@/lib/admin/customer-search'
import { getAdminSearchPage, getAdminSearchServices } from '@/lib/admin/search'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'

const AdminSearchPage = () => (
  <Suspense fallback={<AdminSkeleton variant="list" maxWidth="max-w-4xl" />}>
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
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-5 sm:px-8 sm:py-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
      >
        <Link href="/admin">
          <ChevronLeft className="size-4" /> Agenda
        </Link>
      </Button>
      <header className="mt-2 flex items-start gap-3">
        <span className="mt-1 grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Search className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-brand">Arbeauté</p>
          <h1 className="font-heading text-title font-bold">Rechercher</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Retrouvez quelqu’un par son nom, son adresse ou son numéro — ou un
            rendez-vous précis. Rien de ce que vous tapez n’apparaît dans
            l’adresse de la page.
          </p>
        </div>
      </header>
      <AdminSearchTabs
        services={services}
        initialAppointments={initialAppointments}
        initialCustomers={initialCustomers}
      />
    </main>
  )
}

export default AdminSearchPage
