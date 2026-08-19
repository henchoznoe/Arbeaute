import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * « Toute action asynchrone confirme son résultat par un `AppToast`, au lieu de
 * laisser la page se rafraîchir en silence » — règle posée par la v2, et non
 * suivie par les deux écrans les plus utilisés.
 *
 * Enregistrer un rendez-vous n'ouvrait le toast qu'en cas d'échec : le message
 * du serveur, celui qui dit qui a été prévenu et à quelle adresse, était
 * calculé puis jeté. C'est justement ce qu'Arzu ne peut pas deviner.
 */
const APPOINTMENT_FORM = readFileSync(
  'components/admin/appointment-form.tsx',
  'utf8',
)
const CATALOG = readFileSync('lib/actions/catalog.ts', 'utf8')

/** Le corps d'une déclaration, jusqu'à la suivante. */
const sliceFrom = (source: string, start: string, end: string): string => {
  const from = source.indexOf(start)
  expect(from).toBeGreaterThanOrEqual(0)
  const to = source.indexOf(end, from + start.length)
  expect(to).toBeGreaterThan(from)
  return source.slice(from, to)
}

describe('confirmation d’un enregistrement', () => {
  it.each([
    [
      'submit',
      'const submit = (formData: FormData) => {',
      'const previewSeries',
    ],
    ['createSeries', 'const createSeries = () => {', 'const selectCustomer'],
    ['cancel', 'const cancel = () => {', 'return ('],
  ])('ouvre le toast que %s réussisse ou échoue', (_name, start, end) => {
    const body = sliceFrom(APPOINTMENT_FORM, start, end)

    // La formulation d'alors : le toast ne s'ouvrait que pour un échec.
    expect(body).not.toContain('if (!result.ok) setToastOpen(true)')
    expect(body).not.toContain('else setToastOpen(true)')
    expect(body).toContain('setToastOpen(true)')
    // La navigation n'a plus lieu dans la foulée : elle attend la lecture.
    expect(body).not.toContain('router.push(')
    expect(body).toContain('result.ok) setConfirmedHref(`/admin?date=')
  })

  it('affiche le message du serveur avant de rejoindre l’agenda', () => {
    // Le message nomme l'adresse prévenue : il ne peut pas passer par l'URL,
    // donc la navigation attend la fermeture de la confirmation.
    expect(APPOINTMENT_FORM).toContain('router.push(href)')
    expect(APPOINTMENT_FORM).toContain(
      "variant={confirmedHref ? 'success' : 'danger'}",
    )
  })
})

describe('confirmation d’une prestation', () => {
  it.each([
    [
      'createService',
      'export const createService',
      'export const updateService',
    ],
    [
      'updateService',
      'export const updateService',
      'export const duplicateService',
    ],
  ])('%s confirme de la même façon', (_name, start, end) => {
    expect(sliceFrom(CATALOG, start, end)).toContain('?saved=1')
  })
})
