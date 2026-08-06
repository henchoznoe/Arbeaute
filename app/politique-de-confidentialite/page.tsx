import Link from 'next/link'
import { contact } from '@/lib/constants/contact'

const PrivacyPage = () => (
  <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
    <Link href="/" className="font-heading text-xl font-bold">
      Arbeauté
    </Link>
    <h1 className="mt-10 font-heading text-3xl font-bold">
      Politique de confidentialité
    </h1>
    <div className="mt-8 space-y-6 leading-7 text-muted-foreground">
      <p>
        Arbeauté utilise votre prénom, votre nom, votre email, votre numéro de
        téléphone et votre commentaire uniquement pour créer et gérer vos
        rendez-vous.
      </p>
      <p>
        Ces données ne sont ni vendues ni utilisées pour de la prospection.
        Elles sont hébergées dans une base PostgreSQL Neon liée à l’application.
      </p>
      <p>
        Vous pouvez demander l’accès, la rectification ou l’anonymisation de vos
        données en écrivant à{' '}
        <a href={`mailto:${contact.email}`} className="underline">
          {contact.email}
        </a>
        .
      </p>
      <p>
        L’espace « Mes rendez-vous » demande la combinaison exacte de l’email et
        du téléphone. Il n’affiche que les rendez-vous futurs confirmés et la
        session expire après 15 minutes.
      </p>
    </div>
  </main>
)

export default PrivacyPage
