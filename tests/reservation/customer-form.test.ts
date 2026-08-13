import { describe, expect, it } from 'vitest'
import {
  type CustomerFormValues,
  normalizeCustomerFormDisplay,
  validateCustomerForm,
} from '@/lib/reservation/customer-form'

const validValues: CustomerFormValues = {
  firstName: ' Arzu ',
  lastName: ' Yurdakul ',
  email: ' ARZU@example.ch ',
  phone: '079 123 45 67',
  comment: ' À bientôt ',
  consent: true,
}

describe('formulaire client de réservation', () => {
  it('accepte les espaces usuels d’un numéro suisse', () => {
    expect(validateCustomerForm(validValues)).toEqual({})
  })

  it('associe chaque erreur au champ concerné', () => {
    const errors = validateCustomerForm({
      ...validValues,
      firstName: '',
      email: 'invalide',
      phone: '123',
      consent: false,
    })

    expect(errors).toMatchObject({
      firstName: 'Indiquez votre prénom.',
      email: 'Saisissez une adresse e-mail valide.',
      phone: 'Saisissez un numéro suisse ou international valide.',
      consent: 'Votre accord est nécessaire pour créer le rendez-vous.',
    })
  })

  it('prépare une présentation normalisée avant vérification', () => {
    expect(normalizeCustomerFormDisplay(validValues)).toEqual({
      firstName: 'Arzu',
      lastName: 'Yurdakul',
      email: 'arzu@example.ch',
      phone: '+41 79 123 45 67',
      comment: 'À bientôt',
      consent: true,
    })
  })
})
