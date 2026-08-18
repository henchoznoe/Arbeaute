import { describe, expect, it } from 'vitest'
import {
  type AppointmentMailData,
  buildCancelledMail,
  buildConfirmationMail,
  buildRescheduledMail,
} from '@/lib/email/templates'

const base: AppointmentMailData = {
  customerFirstName: 'Marie',
  customerLastName: 'Dupont',
  serviceLabel: 'Soins visage — Soin visage bio',
  startsAt: new Date('2026-08-17T11:30:00.000Z'),
  endsAt: new Date('2026-08-17T12:30:00.000Z'),
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

  it('propose d’ajouter à un agenda et de déplacer, en HTML et en texte', () => {
    // Les boutons sont des tableaux, pas des `<a>` stylés : Outlook ignore la
    // plupart des styles posés sur un lien et rendrait un texte nu.
    expect(mail.html).toContain('<table role="presentation"')
    expect(mail.html).toContain('Ajouter à mon agenda')
    expect(mail.html).toContain('Déplacer ou annuler')
    // La version texte porte les mêmes adresses, écrites en toutes lettres.
    expect(mail.text).toContain(
      'Déplacer ou annuler : https://www.arbeaute-bulle.ch/mes-rendez-vous',
    )
    expect(mail.text).toContain(
      'Ajouter à mon agenda : https://calendar.google.com/',
    )
  })

  it('ne réclame plus le téléphone pour s’identifier', () => {
    // L'identification se fait à l'adresse seule depuis la v1.10 : promettre
    // qu'il faut aussi le numéro envoie chercher une information inutile.
    expect(mail.text).toContain('votre adresse e-mail suffit')
    expect(mail.text).not.toContain('numéro de téléphone utilisé')
  })

  it('dit où arrive une réponse, puisque l’expéditeur ne reçoit rien', () => {
    expect(mail.text).toContain('info@arbeaute.ch')
    expect(mail.html).toContain('info@arbeaute.ch')
  })
})

describe('buildCancelledMail', () => {
  it('invite à reprendre un rendez-vous sans joindre d’agenda', () => {
    const mail = buildCancelledMail(base)
    expect(mail.text).toContain(
      'Prendre un rendez-vous : https://www.arbeaute-bulle.ch/reservation',
    )
    expect(mail.text).not.toContain('Ajouter à mon agenda')
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
