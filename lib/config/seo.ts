import type { Metadata } from 'next'
import { siteConfig } from '@/lib/config/site'
import { contact } from '@/lib/constants/contact'
import type { OpeningDay } from '@/lib/reservation/opening-hours'
import { formatPrice } from '@/lib/utils/format'

interface PageMetadataImage {
  readonly url: string
  readonly alt: string
}

interface PageMetadataOptions {
  readonly title: string
  readonly description: string
  readonly path: `/${string}` | '/'
  /** Passe à false pour les pages privées (espace client, etc.). */
  readonly index?: boolean
  readonly image?: PageMetadataImage
}

const DEFAULT_SOCIAL_IMAGE: PageMetadataImage = {
  url: siteConfig.ogImage,
  alt: 'Arbeauté — Soins esthétiques à Bulle',
}

export const createPageMetadata = ({
  title,
  description,
  path,
  index = true,
  image = DEFAULT_SOCIAL_IMAGE,
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
    images: [image],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [image],
  },
})

export const createCatalogPriceRange = (
  pricesInCents: readonly number[],
): string | undefined => {
  if (pricesInCents.length === 0) return undefined

  const minimum = Math.min(...pricesInCents)
  const maximum = Math.max(...pricesInCents)
  return minimum === maximum
    ? formatPrice(minimum)
    : `${formatPrice(minimum)}–${formatPrice(maximum)}`
}

export const createWebsiteJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteConfig.url}/#website`,
  url: siteConfig.url,
  name: siteConfig.name,
  alternateName: 'Arbeauté Bulle',
  inLanguage: siteConfig.language,
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
  priceRange?: string,
) => ({
  '@context': 'https://schema.org',
  '@type': 'BeautySalon',
  '@id': `${siteConfig.url}/#institut`,
  name: contact.name,
  image: `${siteConfig.url}/arzu.jpeg`,
  url: siteConfig.url,
  telephone: contact.phoneRaw,
  email: contact.email,
  ...(priceRange ? { priceRange } : {}),
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
