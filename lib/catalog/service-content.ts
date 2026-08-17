export interface ServiceCareDetails {
  preparationAdvice: string | null
  contraindications: string | null
  expectedResults: string | null
  aftercareAdvice: string | null
  faqQuestion1: string | null
  faqAnswer1: string | null
  faqQuestion2: string | null
  faqAnswer2: string | null
  faqQuestion3: string | null
  faqAnswer3: string | null
  consentFormUrl: string | null
}

const detailLabels = [
  ['preparationAdvice', 'Comment se préparer'],
  ['contraindications', 'Contre-indications'],
  ['expectedResults', 'Résultats attendus'],
  ['aftercareAdvice', 'Après le soin'],
] as const

export const getServiceCareContent = (service: ServiceCareDetails) => {
  const details = detailLabels.flatMap(([key, label]) =>
    service[key] ? [{ label, value: service[key] }] : [],
  )
  const faq = ([1, 2, 3] as const).flatMap(index => {
    const question = service[`faqQuestion${index}`]
    const answer = service[`faqAnswer${index}`]
    return question && answer ? [{ question, answer }] : []
  })

  return {
    details,
    faq,
    hasContent:
      details.length > 0 || faq.length > 0 || Boolean(service.consentFormUrl),
  }
}
