interface CategoryOption {
  id: string
  name: string
}

interface ServiceValues {
  id?: string
  categoryId?: string | null
  name?: string
  description?: string | null
  durationMinutes?: number
  preparationMinutes?: number
  cleanupMinutes?: number
  priceCents?: number
  priceNote?: string | null
  color?: string
  sortOrder?: number
  isBookable?: boolean
  isVisible?: boolean
}

interface ServiceFormProps {
  action: (formData: FormData) => Promise<void>
  categories: CategoryOption[]
  service?: ServiceValues
  submitLabel: string
}

const fieldClass =
  'h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

export const ServiceForm = ({
  action,
  categories,
  service,
  submitLabel,
}: Readonly<ServiceFormProps>) => (
  <form action={action} className="space-y-5 rounded-2xl border bg-card p-5">
    {service?.id ? <input type="hidden" name="id" value={service.id} /> : null}
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-medium">
        Nom
        <input
          name="name"
          required
          maxLength={150}
          defaultValue={service?.name}
          className={fieldClass}
        />
      </label>
      <label className="space-y-2 text-sm font-medium">
        Groupe
        <select
          name="categoryId"
          required
          defaultValue={service?.categoryId ?? ''}
          className={fieldClass}
        >
          <option value="" disabled>
            Choisir un groupe
          </option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
    </div>

    <label className="block space-y-2 text-sm font-medium">
      Description
      <textarea
        name="description"
        rows={5}
        defaultValue={service?.description ?? ''}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>

    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-2 text-sm font-medium">
        Durée (min)
        <input
          name="durationMinutes"
          type="number"
          min={1}
          max={720}
          required
          defaultValue={service?.durationMinutes ?? 30}
          className={fieldClass}
        />
      </label>
      <label className="space-y-2 text-sm font-medium">
        Préparation (min)
        <input
          name="preparationMinutes"
          type="number"
          min={0}
          max={240}
          required
          defaultValue={service?.preparationMinutes ?? 0}
          className={fieldClass}
        />
      </label>
      <label className="space-y-2 text-sm font-medium">
        Rangement (min)
        <input
          name="cleanupMinutes"
          type="number"
          min={0}
          max={240}
          required
          defaultValue={service?.cleanupMinutes ?? 0}
          className={fieldClass}
        />
      </label>
      <label className="space-y-2 text-sm font-medium">
        Prix (CHF)
        <input
          name="priceChf"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={(service?.priceCents ?? 0) / 100}
          className={fieldClass}
        />
      </label>
    </div>

    <div className="grid gap-5 sm:grid-cols-3">
      <label className="space-y-2 text-sm font-medium">
        Note de prix
        <input
          name="priceNote"
          defaultValue={service?.priceNote ?? ''}
          className={fieldClass}
        />
      </label>
      <label className="space-y-2 text-sm font-medium">
        Couleur
        <input
          name="color"
          type="color"
          required
          defaultValue={service?.color ?? '#927b59'}
          className={fieldClass}
        />
      </label>
      <label className="space-y-2 text-sm font-medium">
        Ordre
        <input
          name="sortOrder"
          type="number"
          min={0}
          required
          defaultValue={service?.sortOrder ?? 0}
          className={fieldClass}
        />
      </label>
    </div>

    <div className="flex flex-wrap gap-6 text-sm">
      <label className="flex items-center gap-2 font-medium">
        <input
          name="isVisible"
          type="checkbox"
          defaultChecked={service?.isVisible ?? true}
        />
        Visible sur le site
      </label>
      <label className="flex items-center gap-2 font-medium">
        <input
          name="isBookable"
          type="checkbox"
          defaultChecked={service?.isBookable ?? true}
        />
        Réservable
      </label>
    </div>

    <button
      type="submit"
      className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
    >
      {submitLabel}
    </button>
  </form>
)
