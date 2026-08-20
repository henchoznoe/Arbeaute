import { contact } from '@/lib/constants/contact'

/**
 * www.arbeaute-bulle.ch est la version canonique : Vercel redirige
 * l'apex (arbeaute-bulle.ch) vers www avec un 308. Toutes les URLs
 * publiques (métadonnées, sitemap, JSON-LD) doivent utiliser ce domaine
 * pour éviter tout contenu dupliqué aux yeux de Google.
 */
export const siteConfig = {
  name: contact.name,
  shortName: 'Arbeauté',
  description:
    'À Bulle, Arbeauté vous propose un large éventail de soins esthétiques : épilation laser, soins du visage, onglerie, microblading, endosphère therapy et bien plus encore.',
  url: 'https://www.arbeaute-bulle.ch',
  locale: 'fr_CH',
  language: 'fr-CH',
  ogImage: '/opengraph-image',
  themeColor: '#927b59',
  backgroundColor: '#fdf8f3',
  /** Coordonnées extraites de contact.mapsEmbed (paramètres !2d / !3d). */
  geo: {
    latitude: 46.61949387111656,
    longitude: 7.055952776781569,
  },
} as const
