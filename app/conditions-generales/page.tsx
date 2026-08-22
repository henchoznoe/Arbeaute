import { LegalLayout } from '@/components/legal/legal-layout'
import { LEGAL_LAST_UPDATED, VAT_REGISTERED } from '@/lib/config/legal'
import { createPageMetadata } from '@/lib/config/seo'
import { contact } from '@/lib/constants/contact'
import {
  formatBookingHorizon,
  formatBookingNotice,
  getBookingSettings,
} from '@/lib/reservation/booking-settings'
import { CUSTOMER_CHANGE_CUTOFF_HOURS } from '@/lib/reservation/constants'

export const metadata = createPageMetadata({
  title: 'Conditions générales',
  description:
    'Conditions générales de réservation d’Arbeauté : rendez-vous, annulation et modification.',
  path: '/conditions-generales',
})

const TermsPage = async () => {
  const settings = await getBookingSettings()
  const customerChangeCutoffLabel = `${CUSTOMER_CHANGE_CUTOFF_HOURS} heures`
  // Les deux bornes variables viennent des réglages. Le délai de changement,
  // lui, est fixe : une promesse déjà lue ne doit jamais changer ensuite.
  const noticeLabel = formatBookingNotice(settings.minBookingNoticeHours)
  const horizonLabel = formatBookingHorizon(settings.bookingHorizonMonths)
  return (
    <LegalLayout
      eyebrow="Informations légales"
      title="Conditions générales de réservation"
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <section>
        <h2>Objet</h2>
        <p>
          Les présentes conditions s’appliquent à toute réservation prise en
          ligne sur {contact.website.replace('https://', '')} ou directement
          auprès de {contact.name}, {contact.address}.
        </p>
      </section>

      <section>
        <h2>Réservation</h2>
        <p>
          Une heure proposée dans le calendrier est confirmée immédiatement,
          sans validation manuelle. Les prix affichés sont exprimés en francs
          suisses (CHF)
          {VAT_REGISTERED
            ? ', toutes taxes comprises'
            : ' ; Arbeauté n’étant pas assujettie à la TVA, aucune taxe ne s’y ajoute'}
          . Aucun paiement n’est requis au moment de la réservation ; le
          règlement s’effectue sur place, à l’issue de la prestation.
        </p>
        <p>
          Une réservation doit être prise au moins{' '}
          <strong>{noticeLabel}</strong> à l’avance, et au plus tôt{' '}
          <strong>{horizonLabel}</strong> avant la date souhaitée. Les heures
          qui sortent de ces bornes n’apparaissent pas dans le calendrier.
        </p>
      </section>

      <section>
        <h2>Demandes de dernière minute</h2>
        <p>
          Une heure encore libre mais trop proche pour être réservée en ligne
          peut, selon la période, être proposée « sur demande ». Dans ce cas :{' '}
          <strong>une demande n’est pas un rendez-vous</strong>. Elle est
          transmise à {contact.owner}, qui l’accepte ou la refuse ; tant qu’elle
          n’a pas répondu, le créneau reste disponible pour d’autres, et rien
          n’est réservé.
        </p>
        <p>
          Vous êtes prévenu par e-mail dans les deux cas. Une demande peut être
          retirée à tout moment depuis l’espace « Mes rendez-vous », et le
          nombre de demandes simultanées est limité.
        </p>
      </section>

      <section>
        <h2>Modification et annulation</h2>
        <p>
          Toute demande de modification ou d’annulation doit intervenir au moins{' '}
          <strong>{customerChangeCutoffLabel}</strong> avant l’heure du
          rendez-vous (le week-end n’est pas comptabilisé dans ce délai).
        </p>
        <p>
          Passé ce délai, ou en cas d’absence sans nouvelles (« no-show »), la
          prestation réservée est considérée comme due et pourra être facturée à
          100 % de son prix. Ce délai permet à {contact.owner} de proposer le
          créneau libéré à quelqu’un d’autre.
        </p>
        <p>
          Toute modification ou annulation en dehors de ce délai doit être
          demandée directement par téléphone au{' '}
          <a href={`tel:${contact.phoneRaw}`}>{contact.phone}</a>.
        </p>
      </section>

      <section>
        <h2>Formulaires de consentement</h2>
        <p>
          Certaines prestations (notamment le microblading et certains
          traitements laser) nécessitent la lecture et la signature préalable
          d’un formulaire de consentement, à imprimer et apporter le jour du
          rendez-vous. Ce document est indiqué lors de la réservation lorsqu’il
          est requis. Le rendez-vous peut être refusé sur place si ce formulaire
          n’est pas complété.
        </p>
      </section>

      <section>
        <h2>Ponctualité</h2>
        <p>
          En cas de retard, la durée de la prestation pourra être réduite en
          conséquence afin de ne pas retarder les rendez-vous suivants, sans
          réduction du prix annoncé.
        </p>
      </section>

      <section>
        <h2>Droit applicable</h2>
        <p>
          Les présentes conditions sont soumises au droit suisse. En cas de
          litige et à défaut d’accord amiable, les tribunaux du canton de
          Fribourg sont seuls compétents.
        </p>
      </section>
    </LegalLayout>
  )
}

export default TermsPage
