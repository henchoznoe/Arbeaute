import { ChevronLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSearch } from '@/components/admin/admin-search'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { getAdminSearchPage, getAdminSearchServices } from '@/lib/admin/search'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'

const AdminSearchPage = () => (
  <Suspense fallback={<AdminSkeleton maxWidth="max-w-4xl" />}>
    <SearchAppointments />
  </Suspense>
)

const SearchAppointments = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const [services, initialResult] = await Promise.all([
    getAdminSearchServices(prisma),
    getAdminSearchPage(prisma, { query: '', page: 1 }),
  ])

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-5 sm:px-8 sm:py-8">
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Agenda
      </Link>
      <header className="mt-2 flex items-start gap-3">
        <span className="mt-1 grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Search className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-rose-500">Arbeauté</p>
          <h1 className="font-heading text-3xl font-bold">Rechercher</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Retrouvez un rendez-vous avec des filtres combinables, sans exposer
            les coordonnées clientes dans l’adresse de la page.
          </p>
        </div>
      </header>
      <AdminSearch services={services} initialResult={initialResult} />
    </main>
  )
}

export default AdminSearchPage
