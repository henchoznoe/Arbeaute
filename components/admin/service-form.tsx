import { FormField, formControlClass } from '@/components/ui/form-field'
import { SubmitButton } from '@/components/ui/submit-button'

interface CategoryOption {
  id: string
  name: string
}

interface ServiceValues {
  id?: string
  categoryId?: string | null
  name?: string
  description?: string | null
  preparationAdvice?: string | null
  contraindications?: string | null
  expectedResults?: string | null
  aftercareAdvice?: string | null
  faqQuestion1?: string | null
  faqAnswer1?: string | null
  faqQuestion2?: string | null
  faqAnswer2?: string | null
  faqQuestion3?: string | null
  faqAnswer3?: string | null
  durationMinutes?: number
  preparationMinutes?: number
  cleanupMinutes?: number
  priceCents?: number
  priceNote?: string | null
  color?: string
  isBookable?: boolean
  isVisible?: boolean
}

interface ServiceFormProps {
  action: (formData: FormData) => Promise<void>
  categories: CategoryOption[]
  service?: ServiceValues
  submitLabel: string
}

const fieldClass = formControlClass

const textareaClass = `${formControlClass} py-3`

export const ServiceForm = ({
  action,
  categories,
  service,
  submitLabel,
}: Readonly<ServiceFormProps>) => (
  <form action={action} className="space-y-5 rounded-2xl border bg-card p-5">
    {service?.id ? <input type="hidden" name="id" value={service.id} /> : null}
    <div className="grid gap-5 sm:grid-cols-2">
      <FormField controlId="service-name" label="Nom">
        <input
          id="service-name"
          name="name"
          required
          maxLength={150}
          defaultValue={service?.name}
          className={fieldClass}
        />
      </FormField>
      <FormField controlId="service-category" label="Groupe">
        <select
          id="service-category"
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
      </FormField>
    </div>

    <FormField controlId="service-description" label="Description" optional>
      <textarea
        id="service-description"
        name="description"
        rows={5}
        defaultValue={service?.description ?? ''}
        className={textareaClass}
      />
    </FormField>

    <fieldset className="rounded-xl border bg-muted/20 p-4">
      <legend className="px-2 font-heading text-lg font-bold">
        Conseils avant et après le soin
      </legend>
      <p className="mb-4 text-sm text-muted-foreground">
        Ces rubriques sont facultatives. Seules celles qui sont remplies seront
        visibles sur le site.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          controlId="service-preparation-advice"
          label="Préparation"
          optional
        >
          <textarea
            id="service-preparation-advice"
            name="preparationAdvice"
            rows={4}
            maxLength={2000}
            defaultValue={service?.preparationAdvice ?? ''}
            placeholder="Comment se préparer avant le rendez-vous…"
            className={textareaClass}
          />
        </FormField>
        <FormField
          controlId="service-contraindications"
          label="Contre-indications"
          optional
        >
          <textarea
            id="service-contraindications"
            name="contraindications"
            rows={4}
            maxLength={2000}
            defaultValue={service?.contraindications ?? ''}
            placeholder="Situations où le soin est déconseillé…"
            className={textareaClass}
          />
        </FormField>
        <FormField
          controlId="service-expected-results"
          label="Résultats attendus"
          optional
        >
          <textarea
            id="service-expected-results"
            name="expectedResults"
            rows={4}
            maxLength={2000}
            defaultValue={service?.expectedResults ?? ''}
            placeholder="Effets et délai habituellement constatés…"
            className={textareaClass}
          />
        </FormField>
        <FormField controlId="service-aftercare" label="Après-soin" optional>
          <textarea
            id="service-aftercare"
            name="aftercareAdvice"
            rows={4}
            maxLength={2000}
            defaultValue={service?.aftercareAdvice ?? ''}
            placeholder="Entretien et précautions après le soin…"
            className={textareaClass}
          />
        </FormField>
      </div>
    </fieldset>

    <fieldset className="rounded-xl border bg-muted/20 p-4">
      <legend className="px-2 font-heading text-lg font-bold">
        Questions fréquentes
      </legend>
      <p className="mb-4 text-sm text-muted-foreground">
        Ajoutez jusqu’à trois réponses courtes. Une question et sa réponse
        doivent toujours être remplies ensemble.
      </p>
      <div className="space-y-5">
        {([1, 2, 3] as const).map(index => (
          <div key={index} className="grid gap-3 md:grid-cols-2">
            <FormField
              controlId={`service-faq-question-${index}`}
              label={`Question ${index}`}
              optional
            >
              <input
                id={`service-faq-question-${index}`}
                name={`faqQuestion${index}`}
                maxLength={200}
                defaultValue={service?.[`faqQuestion${index}`] ?? ''}
                className={fieldClass}
              />
            </FormField>
            <FormField
              controlId={`service-faq-answer-${index}`}
              label={`Réponse ${index}`}
              optional
            >
              <textarea
                id={`service-faq-answer-${index}`}
                name={`faqAnswer${index}`}
                rows={3}
                maxLength={1000}
                defaultValue={service?.[`faqAnswer${index}`] ?? ''}
                className={textareaClass}
              />
            </FormField>
          </div>
        ))}
      </div>
    </fieldset>

    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <FormField controlId="service-duration" label="Durée (min)">
        <input
          id="service-duration"
          name="durationMinutes"
          type="number"
          min={1}
          max={720}
          required
          defaultValue={service?.durationMinutes ?? 30}
          className={fieldClass}
        />
      </FormField>
      <FormField
        controlId="service-preparation-minutes"
        label="Préparation (min)"
      >
        <input
          id="service-preparation-minutes"
          name="preparationMinutes"
          type="number"
          min={0}
          max={240}
          required
          defaultValue={service?.preparationMinutes ?? 0}
          className={fieldClass}
        />
      </FormField>
      <FormField controlId="service-cleanup-minutes" label="Rangement (min)">
        <input
          id="service-cleanup-minutes"
          name="cleanupMinutes"
          type="number"
          min={0}
          max={240}
          required
          defaultValue={service?.cleanupMinutes ?? 0}
          className={fieldClass}
        />
      </FormField>
      <FormField controlId="service-price" label="Prix (CHF)">
        <input
          id="service-price"
          name="priceChf"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={(service?.priceCents ?? 0) / 100}
          className={fieldClass}
        />
      </FormField>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <FormField controlId="service-price-note" label="Note de prix">
        <input
          id="service-price-note"
          name="priceNote"
          defaultValue={service?.priceNote ?? ''}
          className={fieldClass}
        />
      </FormField>
      <FormField controlId="service-color" label="Couleur">
        <input
          id="service-color"
          name="color"
          type="color"
          required
          defaultValue={service?.color ?? '#927b59'}
          className={fieldClass}
        />
      </FormField>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex min-h-11 items-start gap-3 rounded-xl border bg-background p-3 text-sm font-medium focus-within:ring-3 focus-within:ring-ring/40">
        <input
          name="isVisible"
          type="checkbox"
          className="mt-0.5 size-5 accent-primary"
          defaultChecked={service?.isVisible ?? true}
        />
        <span>
          Visible sur le site
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Apparaît dans le catalogue de la page d’accueil, avec sa description
            et son prix.
          </span>
        </span>
      </label>
      <label className="flex min-h-11 items-start gap-3 rounded-xl border bg-background p-3 text-sm font-medium focus-within:ring-3 focus-within:ring-ring/40">
        <input
          name="isBookable"
          type="checkbox"
          className="mt-0.5 size-5 accent-primary"
          defaultChecked={service?.isBookable ?? true}
        />
        <span>
          Réservable
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Elle peut être choisie dans l’assistant de réservation en ligne. À
            décocher pour un tarif variable (ex. « au temps passé ») que vous
            réservez vous-même.
          </span>
        </span>
      </label>
    </div>

    <SubmitButton pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
  </form>
)
