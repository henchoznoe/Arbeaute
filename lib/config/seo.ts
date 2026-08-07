import type { Metadata } from 'next'
import { siteConfig } from '@/lib/config/site'
import { contact } from '@/lib/constants/contact'
import type { OpeningDay } from '@/lib/reservation/opening-hours'

interface PageMetadataOptions {
  readonly title: string
  readonly description: string
  readonly path: `/${string}` | '/'
  /** Passe à false pour les pages privées (espace client, etc.). */
  readonly index?: boolean
}

export const createPageMetadata = ({
  title,
  description,
  path,
  index = true,
}: Readonly<PageMetadataOptions>): Metadata => ({
  title,
  description,
  alternates: { canonical: path },
  robots: index
    ? { index: true, follow: true }
    : { index: false, follow: false },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title,
    description,
    url: path,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
})

const SCHEMA_DAY_BY_LABEL: Record<string, string> = {
  Lundi: 'Monday',
  Mardi: 'Tuesday',
  Mercredi: 'Wednesday',
  Jeudi: 'Thursday',
  Vendredi: 'Friday',
  Samedi: 'Saturday',
  Dimanche: 'Sunday',
}

/**
 * Fiche BeautySalon (sous-type de LocalBusiness) pour le pack Local SEO de
 * Google : adresse, géolocalisation et horaires réels tirés des
 * disponibilités hebdomadaires gérées par Arzu dans l'administration.
 */
export const createLocalBusinessJsonLd = (
  openingHours: readonly OpeningDay[],
) => ({
  '@context': 'https://schema.org',
  '@type': 'BeautySalon',
  '@id': `${siteConfig.url}/#institut`,
  name: contact.name,
  image: `${siteConfig.url}${siteConfig.ogImage}`,
  url: siteConfig.url,
  telephone: contact.phoneRaw,
  email: contact.email,
  priceRange: 'CHF',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Place du marché 25',
    postalCode: '1630',
    addressLocality: 'Bulle',
    addressRegion: 'FR',
    addressCountry: 'CH',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: siteConfig.geo.latitude,
    longitude: siteConfig.geo.longitude,
  },
  hasMap: contact.mapsUrl,
  sameAs: [contact.social.facebook, contact.social.instagram],
  openingHoursSpecification: openingHours.flatMap(day =>
    day.ranges.map(range => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${SCHEMA_DAY_BY_LABEL[day.day]}`,
      opens: range.start,
      closes: range.end,
    })),
  ),
})
