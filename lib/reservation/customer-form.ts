import {
  formatPhoneForDisplay,
  normalizeEmail,
  normalizePhone,
} from '@/lib/reservation/identity'

export interface CustomerFormValues {
  firstName: string
  lastName: string
  email: string
  phone: string
  comment: string
  consent: boolean
}

export type CustomerFormField = keyof CustomerFormValues
export type CustomerFormErrors = Partial<Record<CustomerFormField, string>>

export const emptyCustomerForm: CustomerFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  comment: '',
  consent: false,
}

export const customerFieldOrder: CustomerFormField[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'comment',
  'consent',
]

export const validateCustomerField = (
  field: CustomerFormField,
  values: CustomerFormValues,
): string | null => {
  if (field === 'firstName') {
    if (values.firstName.trim().length === 0) return 'Indiquez votre prénom.'
    if (values.firstName.trim().length > 100)
      return 'Le prénom doit contenir au maximum 100 caractères.'
  }
  if (field === 'lastName') {
    if (values.lastName.trim().length === 0) return 'Indiquez votre nom.'
    if (values.lastName.trim().length > 100)
      return 'Le nom doit contenir au maximum 100 caractères.'
  }
  if (field === 'email') {
    if (values.email.trim().length === 0)
      return 'Indiquez votre adresse e-mail.'
    try {
      normalizeEmail(values.email)
    } catch {
      return 'Saisissez une adresse e-mail valide.'
    }
  }
  if (field === 'phone') {
    if (values.phone.trim().length === 0)
      return 'Indiquez votre numéro de téléphone.'
    try {
      normalizePhone(values.phone)
    } catch {
      return 'Saisissez un numéro suisse ou international valide.'
    }
  }
  if (field === 'comment' && values.comment.trim().length > 1000)
    return 'Le commentaire doit contenir au maximum 1000 caractères.'
  if (field === 'consent' && !values.consent)
    return 'Votre accord est nécessaire pour créer le rendez-vous.'
  return null
}

/**
 * Ne valide que les champs demandés.
 *
 * Le tunnel pose l'adresse seule, puis le nom et le téléphone à qui n'a pas
 * encore de fiche : valider tout le formulaire à chaque étape signalerait des
 * champs que l'écran n'a jamais montrés.
 */
export const validateCustomerFields = (
  values: CustomerFormValues,
  fields: CustomerFormField[],
): CustomerFormErrors =>
  Object.fromEntries(
    fields.flatMap(field => {
      const error = validateCustomerField(field, values)
      return error ? [[field, error]] : []
    }),
  )

export const validateCustomerForm = (
  values: CustomerFormValues,
): CustomerFormErrors => validateCustomerFields(values, customerFieldOrder)

export const normalizeCustomerFormDisplay = (
  values: CustomerFormValues,
): CustomerFormValues => ({
  ...values,
  firstName: values.firstName.trim(),
  lastName: values.lastName.trim(),
  email: normalizeEmail(values.email),
  phone: formatPhoneForDisplay(values.phone),
  comment: values.comment.trim(),
})
