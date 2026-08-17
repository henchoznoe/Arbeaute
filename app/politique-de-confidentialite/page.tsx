import { LegalLayout } from '@/components/legal/legal-layout'
import { createPageMetadata } from '@/lib/config/seo'
import { contact } from '@/lib/constants/contact'

export const metadata = createPageMetadata({
  title: 'Politique de confidentialité',
  description:
    'Comment Arbeauté collecte, utilise et protège les données transmises lors d’une réservation en ligne.',
  path: '/politique-de-confidentialite',
})

const PrivacyPage = () => (
  <LegalLayout
    eyebrow="Informations légales"
    title="Politique de confidentialité"
    lastUpdated="7 août 2026"
  >
    <section>
      <h2>Responsable du traitement</h2>
      <p>
        {contact.owner}, {contact.name}, {contact.address}, est responsable du
        traitement des données collectées sur ce site. Pour toute question
        relative à vos données, écrivez à{' '}
        <a href={`mailto:${contact.email}`}>{contact.email}</a> ou appelez le{' '}
        <a href={`tel:${contact.phoneRaw}`}>{contact.phone}</a>.
      </p>
    </section>

    <section>
      <h2>Données collectées lors d’une réservation</h2>
      <p>
        Pour réserver un rendez-vous, ce site vous demande votre prénom, votre
        nom, votre e-mail, votre numéro de téléphone complet et,
        facultativement, un commentaire. Ces informations sont utilisées
        uniquement pour créer et gérer votre rendez-vous, et pour vous permettre
        de le retrouver dans l’espace « Mes rendez-vous ». Elles ne sont ni
        vendues, ni utilisées à des fins de prospection commerciale, ni
        transmises à des tiers en dehors des prestataires techniques mentionnés
        ci-dessous.
      </p>
      <p>
        L’espace « Mes rendez-vous » exige la combinaison exacte de l’e-mail et
        du téléphone utilisés lors de la réservation. Il n’affiche que les
        rendez-vous futurs confirmés ; la session d’identification est conservée
        dans un cookie technique et expire automatiquement.
      </p>
    </section>

    <section>
      <h2>Cookies et session</h2>
      <p>
        Ce site utilise uniquement des cookies techniques indispensables au
        fonctionnement du service : un cookie de session pour l’espace « Mes
        rendez-vous » et, pour {contact.owner}, un cookie de session pour
        l’administration. Ces cookies sont chiffrés, ne contiennent aucune
        donnée personnelle en clair et ne servent à aucun suivi publicitaire.
      </p>
      <p>
        Le site utilise également Vercel Web Analytics pour mesurer, de manière
        agrégée, la fréquentation des pages. Selon la documentation de Vercel,
        cette mesure d’audience n’utilise pas de cookies et ne permet pas
        d’identifier individuellement un visiteur.
      </p>
    </section>

    <section>
      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par Vercel Inc. Les rendez-vous et le catalogue de
        prestations sont stockés dans une base de données PostgreSQL hébergée
        chez Neon. Les images de prestations et les formulaires de consentement
        PDF sont stockés sur Vercel Blob. Voir les{' '}
        <a href="/mentions-legales">mentions légales</a> pour plus de détails.
      </p>
    </section>

    <section>
      <h2>Conservation des données</h2>
      <p>
        Les rendez-vous annulés sont conservés dans l’historique afin de libérer
        le créneau correspondant, sans bloquer le calendrier. Aucune suppression
        automatique n’est effectuée à ce jour ; une anonymisation manuelle peut
        être demandée à tout moment.
      </p>
    </section>

    <section>
      <h2>Vos droits</h2>
      <p>
        Conformément à la législation suisse sur la protection des données, vous
        pouvez demander l’accès, la rectification ou l’anonymisation des données
        vous concernant en écrivant à l’adresse ci-dessus. Cette politique peut
        être adaptée si les services du site évoluent ; la date de dernière mise
        à jour figure en haut de cette page.
      </p>
    </section>
  </LegalLayout>
)

export default PrivacyPage
