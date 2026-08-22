import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * `AGENTS.md` et `README.md` sont ce que lisent en premier les agents qui
 * travaillent sur le dépôt : un chiffre faux s'y propage plus loin qu'un
 * commentaire faux.
 *
 * Les deux livraisons « late booking » ont dépassé la documentation — quatre
 * gabarits d'e-mail annoncés pour huit, quatre réglages de réservation pour six,
 * un ordre d'étapes que la v3 avait inversé. Ce test remplace la relecture par
 * une règle : chaque affirmation chiffrée est comparée au code qu'elle décrit.
 */

const AGENTS = readFileSync('AGENTS.md', 'utf8')
const README = readFileSync('README.md', 'utf8')
const TEMPLATES = readFileSync('lib/email/templates.ts', 'utf8')
const BOOKING_SETTINGS = readFileSync(
  'lib/reservation/booking-settings.ts',
  'utf8',
)
const LATE_REQUEST_ACTIONS = readFileSync(
  'lib/actions/late-requests.ts',
  'utf8',
)
const LATE_REQUESTS = readFileSync('lib/reservation/late-requests.ts', 'utf8')
const WIZARD = readFileSync(
  'components/reservation/reservation-wizard.tsx',
  'utf8',
)

/** Les documents s'écrivent en anglais : les chiffres s'y lisent en toutes lettres. */
const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
]

const countMatches = (source: string, pattern: RegExp): number =>
  source.match(pattern)?.length ?? 0

describe('documentation d’accord avec le code', () => {
  it('annonce autant de gabarits d’e-mail qu’il en existe', () => {
    const templates = countMatches(TEMPLATES, /^export const build\w*Mail/gm)

    expect(templates).toBeGreaterThan(0)
    expect(AGENTS).toContain(
      `**${NUMBER_WORDS[templates].replace(/^./, initial => initial.toUpperCase())} templates exist**`,
    )
  })

  it('nomme chacun des réglages de réservation', () => {
    const values = BOOKING_SETTINGS.match(
      /export interface BookingSettingsValues \{([\s\S]*?)\n\}/,
    )?.[1]
    expect(values).toBeDefined()

    // L'interface publique est la vérité active. La colonne de l'ancien délai
    // subsiste un déploiement en base, mais le code l'ignore déjà.
    const settings = (values as string)
      .split('\n')
      .flatMap(line => line.match(/^ {2}(\w+):/)?.[1] ?? [])

    expect(settings).toHaveLength(5)
    expect(AGENTS).toContain(
      `source of truth for **${NUMBER_WORDS[settings.length]}** settings`,
    )
    for (const setting of settings) expect(AGENTS).toContain(`\`${setting}\``)
  })

  it('décrit les étapes du tunnel dans l’ordre où elles se présentent', () => {
    const labels = [
      ...WIZARD.matchAll(/\{ label: '([^']+)', step: STEPS\./g),
    ].map(match => match[1].toLowerCase())

    expect(labels).toHaveLength(4)
    expect(README).toContain(
      `**Réservation en quatre étapes** — ${labels[0]}, ${labels[1]}, ${labels[2]} et\n  ${labels[3]}.`,
    )
  })

  it('cite les deux limites des demandes de dernière minute', () => {
    const perWindow = Number(
      LATE_REQUEST_ACTIONS.match(/const LATE_REQUEST_LIMIT = (\d+)/)?.[1],
    )
    const pending = Number(
      LATE_REQUESTS.match(
        /const MAX_PENDING_REQUESTS_PER_CUSTOMER = (\d+)/,
      )?.[1],
    )

    expect(LATE_REQUEST_ACTIONS).toContain(
      'const LATE_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000',
    )
    expect(AGENTS).toContain(
      `**${NUMBER_WORDS[perWindow]} requests per 24 hours**`,
    )
    expect(AGENTS).toContain(`**${NUMBER_WORDS[pending]} pending requests**`)
    expect(README).toContain(`Trois demandes par 24 heures`)
  })

  it('mentionne l’écran des demandes et l’absence de balayage', () => {
    expect(AGENTS).toContain('`/admin/demandes`')
    expect(AGENTS).toContain('**No job sweeps expired requests**')
    // Une demande reste hors de la contrainte d'exclusion : c'est le point le
    // plus contre-intuitif de la fonctionnalité, il doit rester écrit.
    expect(AGENTS).toContain('appointment_no_confirmed_overlap')
    expect(LATE_REQUESTS).toContain('export const isLateRequestExpired')
  })
})
