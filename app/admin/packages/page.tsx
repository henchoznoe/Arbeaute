import { ChevronDown, ChevronUp, Gift, Plus } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { Button } from '@/components/ui/button'
import { movePackage } from '@/lib/actions/packages'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { formatPrice } from '@/lib/utils/format'

const AdminPackagesPage = () => (
  <Suspense fallback={<AdminSkeleton variant="list" />}>
    <AdminPackages />
  </Suspense>
)

const AdminPackages = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const items = await prisma.package.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { customerPackages: true } } },
  })
  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/settings"
        backLabel="Réglages"
        title="Forfaits"
        icon={Gift}
        description="Offres de plusieurs séances et forfaits en cours."
        aside={
          <Button asChild>
            <Link href="/admin/packages/new">
              <Plus className="size-4" />
              Nouveau forfait
            </Link>
          </Button>
        }
      />
      <div className="mt-5 grid gap-3">
        {items.map((item, index) => (
          <article
            key={item.id}
            className="flex items-center gap-2 rounded-2xl border bg-card p-2"
          >
            <Link
              href={`/admin/packages/${item.id}`}
              className="min-w-0 flex-1 rounded-xl p-2 transition hover:bg-muted"
            >
              <span className="font-semibold">{item.name}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {item.sessionCount} séances · {formatPrice(item.priceCents)} ·{' '}
                {item._count.customerPackages} ouverts
                {item.isArchived
                  ? ' · Mis de côté'
                  : item.isVisible
                    ? ' · Visible'
                    : ' · Masqué'}
              </span>
            </Link>
            <form action={movePackage} className="grid gap-1">
              <input type="hidden" name="id" value={item.id} />
              <button
                type="submit"
                name="direction"
                value="up"
                disabled={index === 0}
                aria-label={`Monter ${item.name}`}
                className="rounded-lg border p-2 disabled:opacity-30"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="submit"
                name="direction"
                value="down"
                disabled={index === items.length - 1}
                aria-label={`Descendre ${item.name}`}
                className="rounded-lg border p-2 disabled:opacity-30"
              >
                <ChevronDown className="size-4" />
              </button>
            </form>
          </article>
        ))}
        {items.length === 0 ? (
          <p className="rounded-2xl border bg-card p-5 text-muted-foreground">
            Aucun forfait pour le moment.
          </p>
        ) : null}
      </div>
    </AdminPage>
  )
}

export default AdminPackagesPage
