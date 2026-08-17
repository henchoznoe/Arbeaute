import { describe, expect, it } from 'vitest'
import {
  type AppointmentMailData,
  buildCancelledMail,
  buildConfirmationMail,
  buildDailyDigestMail,
  buildReminderMail,
  buildRescheduledMail,
} from '@/lib/email/templates'

const base: AppointmentMailData = {
  customerFirstName: 'Marie',
  customerLastName: 'Dupont',
  serviceLabel: 'Soins visage — Soin visage bio',
  startsAt: new Date('2026-08-17T11:30:00.000Z'),
  priceCents: 12_000,
}

describe('buildConfirmationMail', () => {
  const mail = buildConfirmationMail(base)

  it('annonce la date et l’heure dans le fuseau du salon', () => {
    // 11:30 UTC en août à Zurich correspond à 13:30 locales. La date suit le
    // gabarit unique de `formatLongDate`, celui-là même employé à l'écran.
    expect(mail.subject).toBe(
      'Rendez-vous confirmé — lundi 17 août 2026 à 13:30',
    )
  })

  it('rappelle soin, date, heure, prix et adresse en texte brut', () => {
    expect(mail.text).toContain('Soin : Soins visage — Soin visage bio')
    expect(mail.text).toContain('Date : lundi 17 août 2026')
    expect(mail.text).toContain('Heure : 13:30')
    // `Intl` colle le montant au sigle par une espace insécable.
    expect(mail.text.replace(/\u00a0/g, ' ')).toContain('Prix : 120 CHF')
    expect(mail.text).toContain('Place du marché 25, 1630 Bulle')
  })

  it('produit une version HTML complète', () => {
    expect(mail.html).toContain('<!doctype html>')
    expect(mail.html).toContain('Votre rendez-vous est confirmé')
    expect(mail.html.replace(/\u00a0/g, ' ')).toContain('120 CHF')
  })

  it('salue par le prénom, et retombe sur le nom quand il manque', () => {
    expect(mail.text.startsWith('Bonjour Marie,')).toBe(true)
    expect(
      buildConfirmationMail({ ...base, customerFirstName: null }).text,
    ).toContain('Bonjour Dupont,')
  })
})

describe('échappement HTML', () => {
  it('neutralise le HTML saisi dans un nom', () => {
    const mail = buildConfirmationMail({
      ...base,
      customerFirstName: '<script>alert(1)</script>',
    })
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
  })
})

describe('buildRescheduledMail', () => {
  it('rappelle l’ancien horaire quand il est connu', () => {
    const mail = buildRescheduledMail({
      ...base,
      previousStartsAt: new Date('2026-08-15T08:00:00.000Z'),
    })
    expect(mail.text).toContain('Ancien horaire : samedi 15 août 2026 à 10:00')
    expect(mail.subject).toContain('Rendez-vous déplacé')
  })

  it('reste correct sans ancien horaire', () => {
    const mail = buildRescheduledMail(base)
    expect(mail.text).not.toContain('Ancien horaire')
  })
})

describe('buildCancelledMail', () => {
  it('emploie le passé et invite à reprendre rendez-vous', () => {
    const mail = buildCancelledMail(base)
    expect(mail.subject).toContain('Rendez-vous annulé')
    expect(mail.text).toContain('Était prévu le : lundi 17 août 2026 à 13:30')
    expect(mail.text).toContain('/reservation')
  })
})

describe('buildReminderMail', () => {
  it('annonce le rendez-vous du lendemain', () => {
    const mail = buildReminderMail(base)
    expect(mail.subject).toBe('Rappel — rendez-vous demain à 13:30')
    expect(mail.text).toContain('nous vous attendons demain')
  })
})

describe('buildDailyDigestMail', () => {
  it('liste les rendez-vous avec heure, cliente, soin et téléphone', () => {
    const mail = buildDailyDigestMail('lundi 17 août 2026', [
      {
        time: '09:00',
        customerName: 'Marie Dupont',
        serviceLabel: 'Soin visage bio',
        phone: '+41 79 123 45 67',
      },
      {
        time: '14:00',
        customerName: 'Sans Numéro',
        serviceLabel: 'Épilation',
        phone: null,
      },
    ])
    expect(mail.subject).toBe('2 rendez-vous lundi 17 août 2026')
    expect(mail.text).toContain(
      '09:00 — Marie Dupont — Soin visage bio — +41 79 123 45 67',
    )
    expect(mail.text).toContain('14:00 — Sans Numéro — Épilation')
  })

  it('le dit clairement quand la journée est vide', () => {
    const mail = buildDailyDigestMail('dimanche 16 août 2026', [])
    expect(mail.subject).toBe('Aucun rendez-vous dimanche 16 août 2026')
    expect(mail.text).toContain('Aucun rendez-vous n’est prévu')
  })
})
