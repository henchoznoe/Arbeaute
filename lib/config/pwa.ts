import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/config/site'

type Manifest = MetadataRoute.Manifest

/**
 * Le site expose deux applications installables distinctes :
 *
 * - la vitrine (`/`) pour la clientèle ;
 * - la console d'administration (`/admin`) pour Arzu.
 *
 * Un navigateur identifie une application installée par le champ `id` de
 * son manifeste ; c'est aussi le manifeste — et non l'URL courante — qui
 * fixe le `start_url` du raccourci. Avec un manifeste unique en `/`,
 * « Ajouter à l'écran d'accueil » depuis `/admin` créait donc toujours un
 * raccourci vers la vitrine. Deux manifestes séparés (ids, scopes et
 * start_urls différents) permettent d'installer les deux côte à côte.
 */

const PUBLIC_MANIFEST_PATH = '/manifest.webmanifest'
const ADMIN_MANIFEST_PATH = '/admin/manifest.webmanifest'

const icons = (directory: string, prefix: string): Manifest['icons'] => [
  {
    src: `${directory}/${prefix}-192.png`,
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: `${directory}/${prefix}-512.png`,
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: `${directory}/maskable-192.png`,
    sizes: '192x192',
    type: 'image/png',
    purpose: 'maskable',
  },
  {
    src: `${directory}/maskable-512.png`,
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
]

const publicManifest: Manifest = {
  id: '/',
  name: `${siteConfig.name} — Institut de beauté à Bulle`,
  short_name: siteConfig.shortName,
  description: siteConfig.description,
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: siteConfig.backgroundColor,
  theme_color: siteConfig.themeColor,
  lang: siteConfig.language,
  dir: 'ltr',
  categories: ['beauty', 'lifestyle', 'health'],
  icons: [
    {
      src: '/favicon/favicon-32x32.png',
      sizes: '32x32',
      type: 'image/png',
    },
    {
      src: '/favicon/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
    },
    {
      src: '/favicon/android-chrome-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/favicon/android-chrome-256x256.png',
      sizes: '256x256',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/favicon/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/favicon/maskable-icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/favicon/maskable-icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  shortcuts: [
    {
      name: 'Prendre rendez-vous',
      short_name: 'Réserver',
      url: '/reservation',
      icons: [
        {
          src: '/favicon/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    },
    {
      name: 'Mes rendez-vous',
      short_name: 'Mes RDV',
      url: '/mes-rendez-vous',
      icons: [
        {
          src: '/favicon/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    },
  ],
}

const adminManifest: Manifest = {
  id: '/admin',
  name: `${siteConfig.name} Admin — Agenda de l'institut`,
  short_name: 'Arbeauté Admin',
  description:
    "Console d'administration Arbeauté : agenda, rendez-vous, disponibilités et prestations.",
  start_url: '/admin',
  scope: '/admin',
  display: 'standalone',
  orientation: 'portrait',
  background_color: siteConfig.backgroundColor,
  theme_color: '#3a2f28',
  lang: siteConfig.language,
  dir: 'ltr',
  categories: ['business', 'productivity'],
  icons: icons('/favicon/admin', 'icon'),
  shortcuts: [
    {
      name: 'Nouveau rendez-vous',
      short_name: 'Nouveau RDV',
      url: '/admin/appointments/new',
      icons: [
        {
          src: '/favicon/admin/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    },
    {
      name: 'Disponibilités',
      short_name: 'Dispos',
      url: '/admin/availability',
      icons: [
        {
          src: '/favicon/admin/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    },
    {
      name: 'Prestations',
      short_name: 'Prestations',
      url: '/admin/services',
      icons: [
        {
          src: '/favicon/admin/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    },
  ],
}

export type InstallVariant = 'public' | 'admin'

interface InstallTarget {
  /** Manifeste servi par la route `manifestPath`. */
  manifest: Manifest
  manifestPath: string
  /** `apple-mobile-web-app-title` : nom du raccourci sur iOS. */
  appleTitle: string
  icon: string
  title: string
  description: string
  /** Clé localStorage mémorisant un refus de la bannière. */
  dismissKey: string
  dismissDays: number
  /** Délai avant l'apparition de la bannière, en millisecondes. */
  delayMs: number
}

/** Contenu affiché par la bannière d'installation, par application. */
export const installTargets = {
  public: {
    manifest: publicManifest,
    manifestPath: PUBLIC_MANIFEST_PATH,
    appleTitle: siteConfig.shortName,
    icon: '/favicon/android-chrome-192x192.png',
    title: "Installez l'app Arbeauté",
    description:
      'Vos prestations et vos rendez-vous en un geste, directement depuis votre écran d’accueil.',
    dismissKey: 'arbeaute:install-dismissed:public',
    /** Un refus n'est plus sollicité pendant 60 jours. */
    dismissDays: 60,
    /** Laisser le temps de découvrir la page avant de proposer l'app. */
    delayMs: 5000,
  },
  admin: {
    manifest: adminManifest,
    manifestPath: ADMIN_MANIFEST_PATH,
    appleTitle: 'Arbeauté Admin',
    icon: '/favicon/admin/icon-192.png',
    title: "Installez l'app Admin",
    description:
      'Votre agenda Arbeauté toujours à portée de main, sans passer par le navigateur.',
    dismissKey: 'arbeaute:install-dismissed:admin',
    dismissDays: 30,
    delayMs: 1500,
  },
} satisfies Record<InstallVariant, InstallTarget>
