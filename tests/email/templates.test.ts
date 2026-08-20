import { describe, expect, it } from 'vitest'
import {
  type AppointmentMailData,
  buildCancelledMail,
  buildConfirmationMail,
  buildLateRequestDeclinedMail,
  buildLateRequestReceivedMail,
  buildLateRequestSubmittedMail,
  buildRescheduledMail,
  buildSeriesConfirmationMail,
  buildWeeklyDigestMail,
  type LateRequestMailData,
} from '@/lib/email/templates'

const base: AppointmentMailData = {
  customerFirstName: 'Marie',
  customerLastName: 'Dupont',
  serviceLabel: 'Soins visage — Soin visage bio',
  customerEmail: 'marie@example.com',
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
    // Le lien porte l'adresse du destinataire : un clic ouvre ses rendez-vous
    // sans rien redemander, et la route retire ensuite le paramètre de l'URL.
    expect(mail.text).toContain(
      'Déplacer ou annuler : https://www.arbeaute-bulle.ch/mes-rendez-vous/connexion?email=marie%40example.com',
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

describe('le lien « Déplacer ou annuler »', () => {
  it('retombe sur l’écran d’identification quand l’adresse manque', () => {
    // Un rendez-vous ancien peut n'avoir aucune adresse, et l'effacement des
    // coordonnées en écrit NULL : le lien doit rester valide, pas disparaître.
    const mail = buildConfirmationMail({ ...base, customerEmail: null })

    expect(mail.text).toContain(
      'Déplacer ou annuler : https://www.arbeaute-bulle.ch/mes-rendez-vous',
    )
    expect(mail.text).not.toContain('connexion?email=')
  })

  it('encode une adresse qui contient un signe plus', () => {
    const mail = buildConfirmationMail({
      ...base,
      customerEmail: 'marie+institut@example.com',
    })

    expect(mail.text).toContain('email=marie%2Binstitut%40example.com')
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
  const mail = buildCancelledMail(base)

  it('emploie le passé et invite à reprendre rendez-vous', () => {
    expect(mail.subject).toContain('Rendez-vous annulé')
    expect(mail.text).toContain('Était prévu le : lundi 17 août 2026 à 13:30')
    expect(mail.text).toContain(
      'Prendre un rendez-vous : https://www.arbeaute-bulle.ch/reservation',
    )
  })

  it('ne propose pas d’ajouter à un agenda un rendez-vous annulé', () => {
    expect(mail.text).not.toContain('Ajouter à mon agenda')
  })
})

describe('buildSeriesConfirmationMail', () => {
  const occurrences = [
    new Date('2026-08-17T11:30:00.000Z'),
    new Date('2026-08-31T11:30:00.000Z'),
    new Date('2026-09-14T11:30:00.000Z'),
  ]
  const mail = buildSeriesConfirmationMail(base, occurrences)

  it('annonce le nombre de rendez-vous et la première date', () => {
    expect(mail.subject).toBe(
      '3 rendez-vous confirmés — à partir du lundi 17 août 2026',
    )
  })

  it('liste chaque occurrence, en texte comme en HTML', () => {
    for (const label of [
      'lundi 17 août 2026 à 13:30',
      'lundi 31 août 2026 à 13:30',
      'lundi 14 septembre 2026 à 13:30',
    ]) {
      expect(mail.text).toContain(label)
      expect(mail.html).toContain(label)
    }
  })

  it('donne le prix par séance, pas un total trompeur', () => {
    expect(mail.text.replace(/\u00a0/g, ' ')).toContain(
      'Prix par séance : 120 CHF',
    )
  })
})

describe('buildWeeklyDigestMail', () => {
  const base = {
    periodLabel: 'du 10 août 2026 au 16 août 2026',
    visitCount: 12,
    workedLabel: '9 h 30',
    revenueCents: 96_000,
    noShowCount: 0,
    topServiceLabel: 'Soin visage bio',
    upcomingCount: 8,
  }

  it('répond aux quatre questions du bilan', () => {
    const mail = buildWeeklyDigestMail(base)

    expect(mail.subject).toBe(
      '12 personnes reçues du 10 août 2026 au 16 août 2026',
    )
    expect(mail.text).toContain('Personnes reçues : 12')
    expect(mail.text).toContain('Temps de soin : 9 h 30')
    expect(mail.text.replace(/\u00a0/g, ' ')).toContain(
      'Montant réalisé : 960 CHF',
    )
    expect(mail.text).toContain('Semaine qui commence : 8 rendez-vous')
  })

  it('ne met pas un « 0 absence » en avant', () => {
    expect(buildWeeklyDigestMail(base).text).not.toContain('Absences')
    expect(buildWeeklyDigestMail({ ...base, noShowCount: 2 }).text).toContain(
      'Absences notées : 2',
    )
  })

  it('reste court et sans alarme sur une semaine vide', () => {
    const mail = buildWeeklyDigestMail({
      ...base,
      visitCount: 0,
      revenueCents: 0,
      topServiceLabel: null,
    })

    expect(mail.subject).toContain('Semaine calme')
    expect(mail.text).toContain('Aucun rendez-vous honoré')
    expect(mail.text).toContain('La semaine qui commence en compte 8.')
  })
})

const lateRequestBase: LateRequestMailData = {
  customerFirstName: 'Marie',
  customerLastName: 'Dupont',
  customerPhone: '+41791234567',
  serviceLabel: 'Soins visage — Soin visage bio',
  customerEmail: 'marie@example.com',
  requestedStartsAt: new Date('2026-08-17T11:30:00.000Z'),
  priceCents: 12_000,
}

describe('buildLateRequestSubmittedMail', () => {
  it('donne à Arzu de quoi décider sans ouvrir le site', () => {
    const mail = buildLateRequestSubmittedMail({
      ...lateRequestBase,
      comment: 'Si possible plutôt en fin de matinée',
    })
    expect(mail.text).toContain('Marie Dupont')
    expect(mail.text).toContain('+41791234567')
    expect(mail.text).toContain('Si possible plutôt en fin de matinée')
    expect(mail.text).toContain('/admin/demandes')
  })

  it('dit que rien n’est réservé tant qu’elle n’a pas répondu', () => {
    const mail = buildLateRequestSubmittedMail(lateRequestBase)
    expect(mail.text).toContain('Rien n’est réservé')
  })
})

describe('buildLateRequestReceivedMail', () => {
  /**
   * La garantie la plus importante de toute la fonctionnalité : un accusé qui
   * se lit comme une confirmation enverrait quelqu'un se déplacer pour rien.
   */
  it('n’annonce jamais un rendez-vous', () => {
    const mail = buildLateRequestReceivedMail(lateRequestBase)
    expect(mail.text).toContain('Ce n’est pas encore un rendez-vous')
    expect(mail.subject).not.toMatch(/confirmé/i)
    expect(mail.text).not.toMatch(
      /votre rendez-vous est (bien )?(confirmé|enregistré)/i,
    )
  })

  it('laisse le téléphone comme recours immédiat', () => {
    expect(buildLateRequestReceivedMail(lateRequestBase).text).toContain(
      '+41 79 675 67 66',
    )
  })
})

describe('buildLateRequestDeclinedMail', () => {
  it('reprend le mot d’Arzu quand elle en a laissé un', () => {
    const mail = buildLateRequestDeclinedMail({
      ...lateRequestBase,
      declineReason: 'Je suis déjà prise, mais jeudi matin je suis libre.',
    })
    expect(mail.text).toContain('jeudi matin je suis libre')
  })

  it('rouvre le calendrier même sans motif', () => {
    const mail = buildLateRequestDeclinedMail({
      ...lateRequestBase,
      declineReason: null,
    })
    expect(mail.text).toContain('/reservation')
    expect(mail.text).toContain('+41 79 675 67 66')
  })

  it('nomme le soin demandé, groupe compris', () => {
    // Deux demandes en attente le même jour : sans le soin, on ne sait pas
    // laquelle est refusée.
    const mail = buildLateRequestDeclinedMail({
      ...lateRequestBase,
      declineReason: null,
    })
    expect(mail.text).toContain(
      `Votre demande portait sur ${lateRequestBase.serviceLabel}.`,
    )
    expect(mail.html).toContain(lateRequestBase.serviceLabel)
  })
})
