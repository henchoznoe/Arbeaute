import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  Settings2,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { ServiceCategoryPanel } from '@/components/admin/service-category-panel'
import { ServiceRowActions } from '@/components/admin/service-row-actions'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  moveCategory,
  moveService,
  toggleCategory,
} from '@/lib/actions/catalog'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { formatPrice } from '@/lib/utils/format'

const AdminServicesPage = () => (
  <Suspense fallback={<AdminSkeleton variant="cards" />}>
    <AdminServices />
  </Suspense>
)

const AdminServices = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const categories = await prisma.serviceCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      services: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
    },
  })

  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/settings"
        backLabel="Réglages"
        eyebrow="Arbeauté"
        title="Prestations"
        icon={Settings2}
        description={`${categories.reduce(
          (total, item) => total + item.services.length,
          0,
        )} prestations dans ${categories.length} groupes`}
        actions={
          <>
            <ServiceCategoryPanel />
            <Button asChild>
              <Link href="/admin/services/new">
                <Plus className="size-4" />
                Nouvelle prestation
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 space-y-6">
        {categories.map((category, categoryIndex) => (
          <section
            key={category.id}
            className="overflow-hidden rounded-3xl border bg-card shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="size-4 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div className="min-w-0">
                  {/* Un groupe n'est pas une prestation : il le dit, et ses
                      contrôles ne prennent pas la même forme que ceux d'une
                      ligne — ils étaient identiques à 250 px de distance. */}
                  <p className="text-2xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Groupe
                  </p>
                  <h2 className="truncate text-lg font-semibold">
                    {category.name}
                  </h2>
                  {category.description ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {category.description}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ServiceCategoryPanel
                  category={{
                    id: category.id,
                    name: category.name,
                    description: category.description,
                    color: category.color,
                  }}
                />
                <form action={moveCategory}>
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="direction" value="up" />
                  <SubmitButton
                    disabled={categoryIndex === 0}
                    aria-label={`Monter le groupe ${category.name}`}
                    variant="secondary"
                    size="icon"
                  >
                    <ChevronUp className="size-4" />
                  </SubmitButton>
                </form>
                <form action={moveCategory}>
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="direction" value="down" />
                  <SubmitButton
                    disabled={categoryIndex === categories.length - 1}
                    aria-label={`Descendre le groupe ${category.name}`}
                    variant="secondary"
                    size="icon"
                  >
                    <ChevronDown className="size-4" />
                  </SubmitButton>
                </form>
              </div>
            </div>

            <div className="divide-y">
              {category.services.map((service, serviceIndex) => (
                <div
                  key={service.id}
                  className={`flex items-center gap-2 px-3 py-2 ${service.isArchived ? 'opacity-50' : ''}`}
                >
                  {/* Le nom ouvre la prestation : c'est le geste quotidien, et
                      il n'a pas besoin d'un bouton de plus à côté de lui. */}
                  <Link
                    href={`/admin/services/${service.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1.5 transition hover:bg-muted"
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: service.color }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {service.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {service.isVisible ? (
                          <Eye className="size-3.5 shrink-0" />
                        ) : (
                          <EyeOff className="size-3.5 shrink-0" />
                        )}
                        <span className="truncate">
                          {service.durationMinutes} min ·{' '}
                          {formatPrice(service.priceCents)}
                          {service.isBookable ? '' : ' · non réservable'}
                        </span>
                      </span>
                    </span>
                  </Link>
                  <form action={moveService}>
                    <input type="hidden" name="id" value={service.id} />
                    <input type="hidden" name="direction" value="up" />
                    <SubmitButton
                      disabled={serviceIndex === 0}
                      aria-label={`Monter ${service.name}`}
                      variant="ghost"
                      size="icon"
                    >
                      <ChevronUp className="size-4" />
                    </SubmitButton>
                  </form>
                  <form action={moveService}>
                    <input type="hidden" name="id" value={service.id} />
                    <input type="hidden" name="direction" value="down" />
                    <SubmitButton
                      disabled={serviceIndex === category.services.length - 1}
                      aria-label={`Descendre ${service.name}`}
                      variant="ghost"
                      size="icon"
                    >
                      <ChevronDown className="size-4" />
                    </SubmitButton>
                  </form>
                  <ServiceRowActions
                    id={service.id}
                    name={service.name}
                    isArchived={service.isArchived}
                  />
                </div>
              ))}
            </div>

            <form action={toggleCategory} className="border-t p-3 text-right">
              <input type="hidden" name="id" value={category.id} />
              <SubmitButton
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                {category.isActive
                  ? 'Désactiver le groupe'
                  : 'Réactiver le groupe'}
              </SubmitButton>
            </form>
          </section>
        ))}
      </div>
    </AdminPage>
  )
}

export default AdminServicesPage
