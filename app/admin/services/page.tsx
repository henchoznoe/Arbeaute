import {
  Archive,
  ChevronDown,
  ChevronUp,
  Copy,
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
import { ServiceDeleteButton } from '@/components/admin/service-delete-button'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  duplicateService,
  moveCategory,
  moveService,
  toggleCategory,
  toggleServiceArchive,
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
                    aria-label={`Monter ${category.name}`}
                    variant="outline"
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
                    aria-label={`Descendre ${category.name}`}
                    variant="outline"
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
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 ${service.isArchived ? 'opacity-50' : ''}`}
                >
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: service.color }}
                  />
                  <div className="min-w-52 flex-1">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.durationMinutes} min ·{' '}
                      {formatPrice(service.priceCents)}
                      {service.priceNote ? ` ${service.priceNote}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {service.isVisible ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                    {service.isBookable ? 'Réservable' : 'Non réservable'}
                  </div>
                  <div className="flex gap-1">
                    <form action={moveService}>
                      <input type="hidden" name="id" value={service.id} />
                      <input type="hidden" name="direction" value="up" />
                      <SubmitButton
                        disabled={serviceIndex === 0}
                        aria-label={`Monter ${service.name}`}
                        variant="outline"
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
                        variant="outline"
                        size="icon"
                      >
                        <ChevronDown className="size-4" />
                      </SubmitButton>
                    </form>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/services/${service.id}`}>Modifier</Link>
                  </Button>
                  <form action={duplicateService}>
                    <input type="hidden" name="id" value={service.id} />
                    <SubmitButton
                      aria-label={`Dupliquer ${service.name}`}
                      variant="outline"
                      size="icon"
                    >
                      <Copy className="size-4" />
                    </SubmitButton>
                  </form>
                  <form action={toggleServiceArchive}>
                    <input type="hidden" name="id" value={service.id} />
                    <SubmitButton
                      aria-label={
                        service.isArchived
                          ? `Réactiver ${service.name}`
                          : `Archiver ${service.name}`
                      }
                      variant="outline"
                      size="icon"
                    >
                      <Archive className="size-4" />
                    </SubmitButton>
                  </form>
                  <ServiceDeleteButton id={service.id} name={service.name} />
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
