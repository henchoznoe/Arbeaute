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
const APPOINTMENT_FORM = readFileSync(
  'components/admin/appointment-form.tsx',
  'utf8',
)
const SERVICE_PICKER = readFileSync(
  'components/admin/service-picker.tsx',
  'utf8',
)
const CUSTOMER_PAGE = readFileSync('app/admin/customers/[id]/page.tsx', 'utf8')
const CUSTOMER_CONTROLS = readFileSync(
  'components/admin/customer-profile-controls.tsx',
  'utf8',
)
const SETTINGS_PAGE = readFileSync('app/admin/settings/page.tsx', 'utf8')
const AVAILABILITY_PAGE = readFileSync(
  'app/admin/availability/page.tsx',
  'utf8',
)
const AVAILABILITY_CALENDAR = readFileSync(
  'components/admin/availability-exception-calendar.tsx',
  'utf8',
)
const AVAILABILITY_SECTIONS = readFileSync(
  'components/admin/availability-sections.tsx',
  'utf8',
)
const SERVICE_CATALOG = readFileSync(
  'components/admin/service-catalog-manager.tsx',
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
  it('garde l’ajout et la journée visibles sur mobile, puis guide la grille sur ordinateur', () => {
    expect(ADMIN_AGENDA).toContain('<AdminDayTimeline')
    expect(ADMIN_AGENDA).toContain('nextAppointmentId={nextAppointmentId}')
    expect(ADMIN_AGENDA).toContain(
      'Cliquez sur un rendez-vous pour le modifier, ou sur une heure libre',
    )
    expect(ADMIN_AGENDA).toContain('<Plus className="size-4" /> Ajouter')
  })

  it('place les actions avant le formulaire replié sur mobile', () => {
    expect(APPOINTMENT_PAGE.indexOf('<CustomerCallButton')).toBeLessThan(
      APPOINTMENT_PAGE.indexOf('Modifier les informations'),
    )
    expect(APPOINTMENT_PAGE).toContain(
      '<details className="group mt-4 rounded-2xl border bg-card">',
    )
    expect(APPOINTMENT_PAGE).toContain('/deplacer`}')
    expect(APPOINTMENT_PAGE).toContain('Déplacer le rendez-vous')
  })

  it('rend l’aide accessible en permanence sans charger la barre du bas', () => {
    expect(ADMIN_NAVIGATION).toContain('href="/admin/aide"')
    expect(ADMIN_NAVIGATION).toContain('title="Menu"')
    expect(ADMIN_NAVIGATION).toContain('<CircleHelp className="size-5" /> Aide')
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

describe('parcours admin mobile', () => {
  it('révèle l’ajout dans l’ordre soin, heure, puis client', () => {
    const serviceStep = APPOINTMENT_FORM.indexOf('1. Choisir le soin')
    const timeStep = APPOINTMENT_FORM.indexOf('2. Date et heure')
    const customerStep = APPOINTMENT_FORM.indexOf('3. Choisir le client')

    expect(serviceStep).toBeGreaterThan(-1)
    expect(serviceStep).toBeLessThan(timeStep)
    expect(timeStep).toBeLessThan(customerStep)
    expect(APPOINTMENT_FORM).toContain('Client déjà connu')
    expect(APPOINTMENT_FORM).toContain('Nouveau client')
    expect(APPOINTMENT_FORM).toContain('sticky bottom-')
  })

  it('permet de choisir un soin sans lancer de recherche', () => {
    expect(SERVICE_PICKER).toContain('if (!normalized) return services')
    expect(SERVICE_PICKER).toContain('ouvrez un groupe')
    expect(SERVICE_PICKER).not.toContain('au moins deux caractères')
  })

  it('ne duplique pas l’appel sur la fiche rendez-vous', () => {
    expect(APPOINTMENT_PAGE.match(/<CustomerCallButton/g)).toHaveLength(1)
    expect(APPOINTMENT_PAGE).toContain('Noter ce qui s’est passé')
  })

  it('présente le prochain rendez-vous avant l’édition du client', () => {
    expect(CUSTOMER_PAGE.indexOf('Prochains rendez-vous')).toBeLessThan(
      CUSTOMER_PAGE.indexOf('<CustomerProfileForm'),
    )
    expect(CUSTOMER_PAGE).not.toContain('Jamais encore')
    expect(CUSTOMER_PAGE).not.toContain('Rien d’habituel')
    expect(CUSTOMER_CONTROLS).toContain('Copier le numéro')
    expect(CUSTOMER_CONTROLS).toContain('Ajouter un rendez-vous')
    expect(CUSTOMER_CONTROLS).toContain("addEventListener('beforeunload'")
  })

  it('groupe les six réglages dans des lignes tactiles', () => {
    for (const label of [
      'Institut',
      'Réservations et messages',
      'Administration',
      'Horaires',
      'Prestations',
      'Règles de réservation',
      'E-mails',
      'Affichage de l’agenda',
      'Données',
    ])
      expect(SETTINGS_PAGE).toContain(label)

    expect(SETTINGS_PAGE).toContain('min-h-16')
  })

  it('sépare les horaires et nomme les trois intentions', () => {
    expect(AVAILABILITY_SECTIONS).toContain('Jours particuliers')
    expect(AVAILABILITY_SECTIONS).toContain('Semaine habituelle')
    expect(AVAILABILITY_PAGE).toContain('<details key={day.value}')
    expect(AVAILABILITY_CALENDAR).toContain('Fermer une période')
    expect(AVAILABILITY_CALENDAR).toContain('Ouvrir exceptionnellement')
    expect(AVAILABILITY_CALENDAR).toContain('Ajouter des vacances')
    expect(AVAILABILITY_CALENDAR).toContain('Ouverture')
    expect(AVAILABILITY_CALENDAR).toContain('Fermeture')
    expect(AVAILABILITY_CALENDAR).not.toContain('label="Type"')
  })

  it('recherche les prestations localement et cache l’ordre par défaut', () => {
    expect(SERVICE_CATALOG).toContain('type="search"')
    expect(SERVICE_CATALOG).toContain('normalizeSearch')
    expect(SERVICE_CATALOG).toContain(
      'open={normalizedQuery ? true : undefined}',
    )
    expect(SERVICE_CATALOG).toContain(
      "ordering ? 'Terminer' : 'Changer l’ordre'",
    )
    expect(SERVICE_CATALOG).toContain('{ordering ? (')
    expect(SERVICE_CATALOG).not.toContain('searchAdmin')
  })
})
