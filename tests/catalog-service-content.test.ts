import { describe, expect, it } from 'vitest'
import {
  getServiceCareContent,
  type ServiceCareDetails,
} from '@/lib/catalog/service-content'

const emptyService: ServiceCareDetails = {
  preparationAdvice: null,
  contraindications: null,
  expectedResults: null,
  aftercareAdvice: null,
  faqQuestion1: null,
  faqAnswer1: null,
  faqQuestion2: null,
  faqAnswer2: null,
  faqQuestion3: null,
  faqAnswer3: null,
  consentFormUrl: null,
}

describe('contenus utiles d’une prestation', () => {
  it('ne rend aucun bloc lorsque toutes les rubriques sont vides', () => {
    expect(getServiceCareContent(emptyService)).toEqual({
      details: [],
      faq: [],
      hasContent: false,
    })
  })

  it('conserve uniquement les rubriques et FAQ complètes', () => {
    const content = getServiceCareContent({
      ...emptyService,
      preparationAdvice: 'Venir sans maquillage.',
      faqQuestion1: 'Combien de temps prévoir ?',
      faqAnswer1: 'Environ une heure.',
      faqQuestion2: 'Question sans réponse',
    })

    expect(content).toMatchObject({
      details: [
        { label: 'Comment se préparer', value: 'Venir sans maquillage.' },
      ],
      faq: [
        {
          question: 'Combien de temps prévoir ?',
          answer: 'Environ une heure.',
        },
      ],
      hasContent: true,
    })
  })

  it('rend l’accès au PDF même sans autre contenu', () => {
    expect(
      getServiceCareContent({
        ...emptyService,
        consentFormUrl: 'https://example.com/consentement.pdf',
      }).hasContent,
    ).toBe(true)
  })
})
