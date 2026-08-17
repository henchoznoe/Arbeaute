import {
  Archive,
  ChevronDown,
  ChevronLeft,
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
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { ServiceDeleteButton } from '@/components/admin/service-delete-button'
import { Button } from '@/components/ui/button'
import { formControlClass } from '@/components/ui/form-field'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  createCategory,
  duplicateService,
  moveCategory,
  moveService,
  toggleCategory,
  toggleServiceArchive,
  updateCategory,
} from '@/lib/actions/catalog'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { formatPrice } from '@/lib/utils/format'

const fieldClass = formControlClass

const AdminServicesPage = () => (
  <Suspense fallback={<AdminSkeleton maxWidth="max-w-6xl" />}>
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
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
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
          <h1 className="mt-2 font-heading text-title font-bold">
            Prestations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {categories.reduce(
              (total, item) => total + item.services.length,
              0,
            )}{' '}
            prestations dans {categories.length} groupes
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/services/new">
            <Plus className="size-4" />
            Nouvelle prestation
          </Link>
        </Button>
      </header>

      <details className="mt-8 rounded-2xl border bg-card p-5">
        <summary className="cursor-pointer font-semibold">
          Nouveau groupe
        </summary>
        <form
          action={createCategory}
          className="mt-5 grid gap-3 md:grid-cols-4"
        >
          <input
            name="name"
            required
            placeholder="Nom"
            className={fieldClass}
          />
          <input
            name="description"
            placeholder="Description"
            className={`${fieldClass} md:col-span-2`}
          />
          <div className="flex gap-2">
            <input
              name="color"
              type="color"
              defaultValue="#927b59"
              required
              className={`${fieldClass} min-w-0 flex-1`}
            />
            <SubmitButton pendingLabel="Ajout…">Ajouter</SubmitButton>
          </div>
        </form>
      </details>

      <div className="mt-6 space-y-6">
        {categories.map((category, categoryIndex) => (
          <section
            key={category.id}
            className="overflow-hidden rounded-2xl border bg-card"
          >
            <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                Ordre du groupe
              </span>
              <div className="flex gap-1">
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

            <form
              action={updateCategory}
              className="grid gap-3 border-b p-4 md:grid-cols-[1fr_2fr_auto_auto]"
            >
              <input type="hidden" name="id" value={category.id} />
              <input
                name="name"
                required
                defaultValue={category.name}
                className={fieldClass}
              />
              <input
                name="description"
                defaultValue={category.description ?? ''}
                className={fieldClass}
              />
              <input
                name="color"
                type="color"
                required
                defaultValue={category.color}
                className="h-11 w-12 rounded-xl border bg-background p-1"
              />
              <SubmitButton pendingLabel="Enregistrement…" variant="outline">
                <Settings2 className="size-4" />
                Enregistrer
              </SubmitButton>
            </form>

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
    </main>
  )
}

export default AdminServicesPage
