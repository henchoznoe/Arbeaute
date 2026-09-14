import { FormField, formControlClass } from '@/components/ui/form-field'
import { SubmitButton } from '@/components/ui/submit-button'

interface ServiceOption {
  id: string
  name: string
  category: { name: string } | null
}

interface PackageValues {
  id?: string
  name?: string
  description?: string | null
  priceCents?: number
  sessionCount?: number
  validityMonths?: number
  isVisible?: boolean
  services?: Array<{ serviceId: string }>
}

export const PackageForm = ({
  action,
  services,
  item,
}: Readonly<{
  action: (formData: FormData) => Promise<void>
  services: ServiceOption[]
  item?: PackageValues
}>) => {
  const selected = new Set(item?.services?.map(service => service.serviceId))
  return (
    <form
      action={action}
      className="space-y-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-7"
    >
      {item?.id ? <input type="hidden" name="id" value={item.id} /> : null}
      <FormField controlId="package-name" label="Nom">
        <input
          id="package-name"
          name="name"
          required
          maxLength={150}
          defaultValue={item?.name}
          className={formControlClass}
        />
      </FormField>
      <FormField controlId="package-description" label="Description" optional>
        <textarea
          id="package-description"
          name="description"
          rows={4}
          defaultValue={item?.description ?? ''}
          className={formControlClass}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField controlId="package-price" label="Prix (CHF)">
          <input
            id="package-price"
            name="priceChf"
            type="number"
            min="0"
            step="0.05"
            required
            defaultValue={(item?.priceCents ?? 0) / 100}
            className={formControlClass}
          />
        </FormField>
        <FormField controlId="package-sessions" label="Nombre de séances">
          <input
            id="package-sessions"
            name="sessionCount"
            type="number"
            min="1"
            max="100"
            required
            defaultValue={item?.sessionCount ?? 5}
            className={formControlClass}
          />
        </FormField>
        <FormField controlId="package-validity" label="Validité (mois)">
          <input
            id="package-validity"
            name="validityMonths"
            type="number"
            min="1"
            max="60"
            required
            defaultValue={item?.validityMonths ?? 12}
            className={formControlClass}
          />
        </FormField>
      </div>
      <fieldset>
        <legend className="font-medium">Prestations utilisables</legend>
        <p className="mt-1 text-sm text-muted-foreground">
          Cochez au moins un soin. La personne choisira parmi cette liste.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {services.map(service => (
            <label
              key={service.id}
              className="flex min-h-12 items-center gap-3 rounded-xl border px-4 py-2"
            >
              <input
                type="checkbox"
                name="serviceIds"
                value={service.id}
                defaultChecked={selected.has(service.id)}
              />
              <span>
                <span className="block font-medium">{service.name}</span>
                <span className="text-xs text-muted-foreground">
                  {service.category?.name}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-3 rounded-xl border p-4">
        <input
          type="checkbox"
          name="isVisible"
          defaultChecked={item?.isVisible ?? true}
        />
        <span>
          <span className="block font-medium">Visible sur le site</span>
          <span className="text-sm text-muted-foreground">
            Le forfait apparaît sur la page publique et peut être réservé.
          </span>
        </span>
      </label>
      <SubmitButton>{item ? 'Enregistrer' : 'Créer le forfait'}</SubmitButton>
    </form>
  )
}
