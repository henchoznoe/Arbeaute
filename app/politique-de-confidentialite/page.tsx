import { LegalLayout } from '@/components/legal/legal-layout'
import { LEGAL_LAST_UPDATED } from '@/lib/config/legal'
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
    lastUpdated={LEGAL_LAST_UPDATED}
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
      <p>
        Ce site n’a aucune activité publicitaire, ne revend aucune donnée, ne
        constitue aucun profil et ne prend aucune décision automatisée à votre
        sujet.
      </p>
    </section>

    <section>
      <h2>Ce que vous nous donnez en réservant</h2>
      <p>
        Une réservation en ligne demande votre <strong>prénom</strong>, votre{' '}
        <strong>nom</strong>, votre <strong>adresse e-mail</strong>, votre{' '}
        <strong>numéro de téléphone</strong> et, si vous le souhaitez, un{' '}
        <strong>commentaire</strong> libre. Ces informations servent à créer le
        rendez-vous, à vous l’envoyer par e-mail et à vous permettre de le
        retrouver dans l’espace « Mes rendez-vous ».
      </p>
      <p>
        Une demande de dernière minute — une heure trop proche pour être
        réservée en ligne — enregistre les mêmes informations, plus le motif
        éventuel du refus.
      </p>
      <p>
        <strong>Chaque rendez-vous conserve une copie</strong> du nom, de
        l’adresse e-mail et du numéro tels qu’ils étaient au moment de la
        réservation, ainsi que le nom, le prix et la durée de la prestation
        d’alors. C’est ce qui permet de relire un rendez-vous ancien tel qu’il a
        eu lieu, même si vos coordonnées ou le catalogue ont changé depuis.
      </p>
    </section>

    <section>
      <h2>Ce que l’institut peut ajouter</h2>
      <p>
        {contact.owner} peut inscrire sur votre fiche une{' '}
        <strong>note interne</strong> et vos <strong>préférences</strong> — par
        exemple une allergie signalée, ou un horaire qui vous convient mieux.
        Ces deux champs ne sont visibles que dans l’administration : ils
        n’apparaissent jamais dans l’espace « Mes rendez-vous » ni dans aucun
        e-mail. Vous pouvez en demander la communication ou la suppression.
      </p>
      <p>
        Le site conserve par ailleurs un{' '}
        <strong>journal des modifications</strong> — qui a créé, déplacé ou
        annulé quel rendez-vous, et quand — ainsi qu’un{' '}
        <strong>journal des e-mails envoyés</strong>, qui retient l’adresse
        destinataire, l’objet et le résultat de l’envoi. Le premier sert à
        retrouver ce qui s’est passé en cas de désaccord ; le second à savoir si
        un message est bien parti.
      </p>
    </section>

    <section>
      <h2>L’espace « Mes rendez-vous »</h2>
      <p>
        Il s’ouvre avec <strong>votre adresse e-mail seule</strong>. Ni mot de
        passe, ni code : l’exigence antérieure d’un numéro de téléphone
        strictement identique enfermait dehors des personnes qui l’avaient noté
        autrement, et les obligeait à téléphoner — précisément ce que cet espace
        existe pour éviter.
      </p>
      <p>
        Ce choix a un prix, et il est assumé : quelqu’un qui connaît votre
        adresse peut voir vos rendez-vous, en déplacer un ou l’annuler. Rien
        n’est détruit pour autant — une annulation libère un créneau et reste
        visible côté institut. Le site ne conserve aucun moyen de paiement,
        aucune donnée bancaire et aucune donnée de santé.
      </p>
      <p>
        L’espace affiche vos rendez-vous à venir, vos demandes en attente de
        réponse, et un historique limité à vos huit derniers rendez-vous, quel
        qu’en soit le statut.
      </p>
      <p>
        Pour limiter les essais, le nombre de tentatives d’identification est
        plafonné par adresse IP. Ce décompte est conservé sous forme d’empreinte
        chiffrée :{' '}
        <strong>votre adresse IP n’est jamais enregistrée en clair</strong>.
      </p>
    </section>

    <section>
      <h2>Cookies</h2>
      <p>
        Ce site ne dépose que deux cookies, tous deux strictement nécessaires à
        son fonctionnement. Aucun cookie publicitaire, aucun traceur tiers,
        aucun bandeau à accepter.
      </p>
      <ul>
        <li>
          <strong>arbeaute_customer_session</strong> — ouvre l’espace « Mes
          rendez-vous ». Durée : <strong>15 minutes</strong>.
        </li>
        <li>
          <strong>arbeaute_admin_session</strong> — réservé à {contact.owner}{' '}
          pour l’administration. Durée : <strong>30 jours</strong>.
        </li>
      </ul>
      <p>
        Les deux sont posés en <code>httpOnly</code> (inaccessibles au
        JavaScript de la page), <code>secure</code> (transmis uniquement en
        HTTPS) et <code>sameSite=lax</code>. Ils ne contiennent{' '}
        <strong>aucune coordonnée</strong> : seulement un identifiant technique
        opaque, accompagné d’une signature qui empêche de les fabriquer ou de
        les modifier. Ils sont <strong>signés, non chiffrés</strong> — la
        distinction compte, et nous préférons l’écrire.
      </p>
      <p>
        Votre navigateur peut par ailleurs mémoriser localement que vous avez
        écarté la proposition d’installer le site en application. Cette
        information ne quitte jamais votre appareil.
      </p>
    </section>

    <section>
      <h2>Mesure d’audience</h2>
      <p>
        Le site utilise <strong>Vercel Web Analytics</strong> et{' '}
        <strong>Vercel Speed Insights</strong>, qui mesurent la fréquentation et
        les temps de chargement. Ces deux outils fonctionnent{' '}
        <strong>sans cookie</strong> et ne permettent pas de vous identifier
        individuellement.
      </p>
    </section>

    <section>
      <h2>Prestataires qui traitent vos données</h2>
      <p>
        Le site ne travaille avec aucun autre prestataire que ceux-ci, et aucune
        donnée n’est vendue ni transmise à des fins commerciales.
      </p>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> — hébergement du site, réseau de
          diffusion, mesure d’audience.
        </li>
        <li>
          <strong>Neon</strong> — base de données des rendez-vous, des fiches et
          du catalogue.
        </li>
        <li>
          <strong>Vercel Blob</strong> — images des prestations et formulaires
          de consentement en PDF.
        </li>
        <li>
          <strong>Resend</strong> — envoi des e-mails. Le message transmis
          contient votre prénom, votre nom, votre adresse, la prestation, la
          date et le prix, ainsi qu’un fichier d’agenda en pièce jointe.
        </li>
        <li>
          <strong>Google</strong> — uniquement la carte affichée sur la page de
          contact, chargée depuis Google Maps. Ce cadre est fourni par Google,
          qui peut y déposer ses propres identifiants ; il ne se charge que sur
          les écrans larges, et la page reste entièrement utilisable sans lui.
        </li>
      </ul>
      <p>
        Ces prestataires sont établis hors de Suisse, principalement aux
        États-Unis. Les données transmises se limitent à ce que chacun a besoin
        de traiter pour le service qu’il rend.
      </p>
      <p>
        Les polices de caractères sont téléchargées une fois à la construction
        du site et servies depuis notre propre domaine :{' '}
        <strong>votre navigateur n’interroge jamais Google Fonts</strong>.
      </p>
    </section>

    <section>
      <h2>Combien de temps vos données sont conservées</h2>
      <p>
        <strong>Aucune suppression automatique n’est programmée.</strong> Les
        rendez-vous, y compris annulés, restent dans l’historique de l’institut,
        qui en a besoin pour son suivi et sa comptabilité.
      </p>
      <p>
        Vous pouvez demander à tout moment l’
        <strong>effacement de vos coordonnées</strong>. Il remplace votre nom,
        votre adresse et votre numéro par une mention neutre, sur votre fiche
        comme sur tous vos rendez-vous, passés compris, et ferme immédiatement
        toute session ouverte. Le rendez-vous lui-même — sa date, sa prestation,
        son prix — subsiste sans plus vous désigner.
      </p>
      <p>
        Deux traces techniques ne sont pas couvertes par cet effacement et
        doivent être supprimées séparément, sur demande : le{' '}
        <strong>journal des e-mails envoyés</strong>, qui retient l’adresse
        destinataire, et le <strong>journal des modifications</strong>. Écrivez
        à <a href={`mailto:${contact.email}`}>{contact.email}</a> pour les faire
        retirer.
      </p>
    </section>

    <section>
      <h2>Vos droits</h2>
      <p>
        Conformément à la loi fédérale sur la protection des données, vous
        pouvez demander l’accès à vos données, leur rectification, leur
        effacement, leur remise dans un format lisible, ainsi que vous opposer à
        leur traitement. Écrivez à{' '}
        <a href={`mailto:${contact.email}`}>{contact.email}</a> ou appelez le{' '}
        <a href={`tel:${contact.phoneRaw}`}>{contact.phone}</a> ; il vous sera
        répondu dans les meilleurs délais.
      </p>
      <p>
        Si la réponse ne vous satisfait pas, vous pouvez saisir le Préposé
        fédéral à la protection des données et à la transparence (PFPDT), à
        Berne.
      </p>
    </section>
  </LegalLayout>
)

export default PrivacyPage
