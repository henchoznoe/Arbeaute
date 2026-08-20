/**
 * Photos d'attente, en attendant celles d'Arzu.
 *
 * **Ce fichier est fait pour disparaître.** Le jour où les photos de l'institut
 * arrivent, elles sont téléversées comme le reste des visuels — sur Vercel
 * Blob, depuis l'administration — et il ne reste plus qu'à supprimer ce module
 * et ses trois usages.
 *
 * Les images sont distantes et marquées `unoptimized` : le plan Vercel Hobby
 * facture 5 000 transformations d'image par mois, et une photo d'attente n'a
 * aucune raison d'en consommer. Les mettre dans `public/` était l'autre
 * possibilité, mais `scripts/verify-build-quality.ts` y surveille un budget de
 * 450 Kio, déjà rempli aux deux tiers.
 *
 * Les visuels des prestations, eux, ne sont **pas** concernés : 32 des 34
 * existent déjà et sont servis depuis Vercel Blob.
 */

export interface Placeholder {
  alt: string
  src: string
}

const unsplash = (id: string, width = 1600): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=70`

/** Le grand visuel de la page d'accueil. */
export const heroPlaceholder: Placeholder = {
  alt: 'Cabine de soin, lumière douce',
  src: unsplash('1600334089648-b0d9d3028eb2'),
}

/** L'institut, sur la page « L'institut ». */
export const institutePlaceholders: Placeholder[] = [
  {
    alt: 'Table de soin préparée',
    src: unsplash('1570172619644-dfd03ed5d881', 1200),
  },
  {
    alt: 'Détail de produits de soin',
    src: unsplash('1596178065887-1198b6148b2b', 1200),
  },
  {
    alt: 'Espace d’accueil de l’institut',
    src: unsplash('1487412720507-e7ab37603c6f', 1200),
  },
]

/** Le bandeau de la page de contact. */
export const contactPlaceholder: Placeholder = {
  alt: 'Devanture d’un institut de beauté',
  src: unsplash('1521590832167-7bcbfaa6381f', 1400),
}
