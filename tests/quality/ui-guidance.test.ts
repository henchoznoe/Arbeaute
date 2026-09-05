import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const PICKER = readFileSync(
  'components/reservation/week-availability-picker.tsx',
  'utf8',
)
const WIZARD = readFileSync(
  'components/reservation/reservation-wizard.tsx',
  'utf8',
)
const RESERVATION_PAGE = readFileSync('app/reservation/page.tsx', 'utf8')
const ADMIN_AGENDA = readFileSync(
  'components/admin/admin-agenda-view.tsx',
  'utf8',
)
const APPOINTMENT_PAGE = readFileSync(
  'app/admin/appointments/[id]/page.tsx',
  'utf8',
)
const HELP_PAGE = readFileSync('app/admin/aide/page.tsx', 'utf8')
const ADMIN_NAVIGATION = readFileSync(
  'components/admin/admin-navigation.tsx',
  'utf8',
)

describe('heures disponibles sur demande', () => {
  it('explique le parcours numérique avant de proposer l’appel', () => {
    expect(PICKER).toContain('Heures disponibles')
    expect(PICKER).toContain('sur demande')
    expect(PICKER).toContain('Choisissez une heure ci-dessous')
    expect(PICKER).toContain('Envoyez la demande')
    expect(PICKER).toContain('Rien n’est réservé tant qu’elle n’a pas accepté')
    expect(PICKER).toContain('Besoin d’une réponse rapide ?')
    expect(PICKER).not.toContain('ou appelez directement')
  })

  it('annonce la nature des heures et leur sélection', () => {
    expect(PICKER).toMatch(/aria-label=\{`\$\{slot\.label\}, sur demande`\}/)
    expect(
      PICKER.match(/aria-pressed=\{startsAt === slot.startsAt\}/g),
    ).toHaveLength(2)
  })

  it('adapte l’action principale aux trois états possibles', () => {
    expect(WIZARD).toContain('Choisissez une heure pour continuer')
    expect(WIZARD).toContain('Vérifier ma demande')
    expect(WIZARD).toContain('Vérifier ma réservation')
  })

  it('distingue encore la demande du rendez-vous à la vérification', () => {
    expect(WIZARD).toContain('Si {contact.owner} accepte votre demande')
    expect(WIZARD).toContain(
      "'ma demande et, si elle est acceptée, mon rendez-vous'",
    )
    expect(RESERVATION_PAGE).toContain(
      'doivent d’abord être acceptées par Arzu',
    )
    expect(RESERVATION_PAGE).not.toContain(
      'choisissez votre prestation, un créneau disponible et confirmez immédiatement',
    )
  })
})

describe('aide aux actions de l’administration', () => {
  it('guide les gestes depuis l’agenda sur mobile et ordinateur', () => {
    expect(ADMIN_AGENDA).toContain(
      'Touchez un rendez-vous pour l’ouvrir et le modifier',
    )
    expect(ADMIN_AGENDA).toContain(
      'Cliquez sur un rendez-vous pour le modifier, ou sur une heure libre',
    )
    expect(ADMIN_AGENDA).toContain('<Plus className="size-4" /> Ajouter')
  })

  it('place le formulaire de modification avant les actions secondaires sur mobile', () => {
    expect(APPOINTMENT_PAGE).toContain(
      '<AdminPageAside className="order-2 lg:order-1">',
    )
    expect(APPOINTMENT_PAGE).toContain(
      '<div className="order-1 min-w-0 lg:order-2">',
    )
    expect(APPOINTMENT_PAGE).toContain(
      'Choisissez « Déplacer le rendez-vous » pour trouver une heure libre',
    )
  })

  it('rend l’aide accessible en permanence sans charger la barre du bas', () => {
    expect(ADMIN_NAVIGATION).toContain('href="/admin/aide"')
    expect(ADMIN_NAVIGATION).toContain('Aide rapide')
  })

  it('couvre les cinq gestes du quotidien', () => {
    for (const title of [
      'Ajouter un rendez-vous',
      'Déplacer un rendez-vous',
      'Annuler un rendez-vous',
      'Retrouver un client ou un rendez-vous',
      'Répondre à une demande de dernière minute',
    ])
      expect(HELP_PAGE).toContain(`title: '${title}'`)

    expect(HELP_PAGE).toContain(
      'Un rendez-vous ne se supprime pas définitivement',
    )
  })
})
