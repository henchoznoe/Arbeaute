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
import { ServiceDeleteButton } from '@/components/admin/service-delete-button'
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

const fieldClass =
  'h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

const AdminServicesPage = async () => {
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
          <Link href="/admin" className="text-sm text-muted-foreground">
            ← Agenda
          </Link>
          <h1 className="mt-2 font-heading text-3xl font-bold">Prestations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {categories.reduce(
              (total, item) => total + item.services.length,
              0,
            )}{' '}
            prestations dans {categories.length} groupes
          </p>
        </div>
        <Link
          href="/admin/services/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <Plus className="size-4" />
          Nouvelle prestation
        </Link>
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
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Ajouter
            </button>
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
                  <button
                    type="submit"
                    disabled={categoryIndex === 0}
                    aria-label={`Monter ${category.name}`}
                    className="grid size-8 place-items-center rounded-lg border disabled:opacity-30"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                </form>
                <form action={moveCategory}>
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    disabled={categoryIndex === categories.length - 1}
                    aria-label={`Descendre ${category.name}`}
                    className="grid size-8 place-items-center rounded-lg border disabled:opacity-30"
                  >
                    <ChevronDown className="size-4" />
                  </button>
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
                className="h-9 w-12 rounded-lg border bg-background p-1"
              />
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium"
              >
                <Settings2 className="size-4" />
                Enregistrer
              </button>
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
                      {(service.priceCents / 100).toLocaleString('fr-CH')} CHF
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
                      <button
                        type="submit"
                        disabled={serviceIndex === 0}
                        aria-label={`Monter ${service.name}`}
                        className="rounded-lg border p-2 disabled:opacity-30"
                      >
                        <ChevronUp className="size-4" />
                      </button>
                    </form>
                    <form action={moveService}>
                      <input type="hidden" name="id" value={service.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={serviceIndex === category.services.length - 1}
                        aria-label={`Descendre ${service.name}`}
                        className="rounded-lg border p-2 disabled:opacity-30"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </form>
                  </div>
                  <Link
                    href={`/admin/services/${service.id}`}
                    className="rounded-lg border px-3 py-2 text-sm font-medium"
                  >
                    Modifier
                  </Link>
                  <form action={duplicateService}>
                    <input type="hidden" name="id" value={service.id} />
                    <button
                      type="submit"
                      aria-label={`Dupliquer ${service.name}`}
                      className="rounded-lg border p-2"
                    >
                      <Copy className="size-4" />
                    </button>
                  </form>
                  <form action={toggleServiceArchive}>
                    <input type="hidden" name="id" value={service.id} />
                    <button
                      type="submit"
                      aria-label={
                        service.isArchived
                          ? `Réactiver ${service.name}`
                          : `Archiver ${service.name}`
                      }
                      className="rounded-lg border p-2"
                    >
                      <Archive className="size-4" />
                    </button>
                  </form>
                  <ServiceDeleteButton id={service.id} name={service.name} />
                </div>
              ))}
            </div>

            <form action={toggleCategory} className="border-t p-3 text-right">
              <input type="hidden" name="id" value={category.id} />
              <button type="submit" className="text-xs text-muted-foreground">
                {category.isActive
                  ? 'Désactiver le groupe'
                  : 'Réactiver le groupe'}
              </button>
            </form>
          </section>
        ))}
      </div>
    </main>
  )
}

export default AdminServicesPage
