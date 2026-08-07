import { LegalLayout } from '@/components/legal/legal-layout'
import { createPageMetadata } from '@/lib/config/seo'
import { contact } from '@/lib/constants/contact'

export const metadata = createPageMetadata({
  title: 'Mentions légales',
  description:
    'Éditeur, hébergement et informations légales du site arbeaute-bulle.ch.',
  path: '/mentions-legales',
})

const LegalNoticePage = () => (
  <LegalLayout
    eyebrow="Informations légales"
    title="Mentions légales"
    lastUpdated="7 août 2026"
  >
    <section>
      <h2>Éditeur du site</h2>
      <p>
        Le site {contact.website.replace('https://', '')} est édité par{' '}
        <strong>{contact.owner}</strong>, {contact.name}, {contact.address},
        Suisse.
      </p>
      <p>
        Forme juridique : entreprise individuelle, non inscrite au registre du
        commerce (numéro IDE/UID non applicable).
      </p>
      <p>
        Contact : <a href={`mailto:${contact.email}`}>{contact.email}</a> ·
        Téléphone : <a href={`tel:${contact.phoneRaw}`}>{contact.phone}</a>
      </p>
    </section>

    <section>
      <h2>Directrice de publication</h2>
      <p>
        {contact.owner}, en sa qualité de propriétaire de {contact.name}.
      </p>
    </section>

    <section>
      <h2>Conception et réalisation</h2>
      <p>
        Développement du site et du système de réservation :{' '}
        <a
          href="https://henchoznoe.ch"
          target="_blank"
          rel="noopener noreferrer"
        >
          Noé Henchoz
        </a>
        .
      </p>
    </section>

    <section>
      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par Vercel Inc. (
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
          vercel.com
        </a>
        ). La base de données des rendez-vous et du catalogue est hébergée chez
        Neon (
        <a href="https://neon.tech" target="_blank" rel="noopener noreferrer">
          neon.tech
        </a>
        ), également via l’infrastructure Vercel. Les images et documents PDF
        des prestations sont stockés sur Vercel Blob.
      </p>
    </section>

    <section>
      <h2>Propriété intellectuelle</h2>
      <p>
        L’ensemble des textes, photographies et éléments graphiques présents sur
        ce site est protégé par le droit d’auteur. Toute reproduction, même
        partielle, sans autorisation préalable est interdite.
      </p>
    </section>

    <section>
      <h2>Responsabilité</h2>
      <p>
        {contact.name} s’efforce de fournir des informations aussi précises que
        possible sur ce site, mais ne pourra être tenue responsable des
        omissions, inexactitudes ou carences dans la mise à jour, qu’elles
        soient de son fait ou du fait des tiers partenaires qui lui fournissent
        ces informations.
      </p>
    </section>

    <section>
      <h2>Droit applicable</h2>
      <p>
        Les présentes mentions légales sont soumises au droit suisse. En cas de
        litige et à défaut d’accord amiable, les tribunaux du canton de Fribourg
        sont seuls compétents.
      </p>
    </section>
  </LegalLayout>
)

export default LegalNoticePage
