import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Suspense } from 'react'

import './globals.css'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration'
import { JsonLd } from '@/components/seo/json-ld'
import { installTargets } from '@/lib/config/pwa'
import { createLocalBusinessJsonLd } from '@/lib/config/seo'
import { siteConfig } from '@/lib/config/site'
import { contact } from '@/lib/constants/contact'
import { getOpeningHours } from '@/lib/reservation/opening-hours'
import { cn } from '@/lib/utils/cn'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-heading',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Arbeauté | Soins esthétiques à Bulle',
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.shortName,
  manifest: installTargets.public.manifestPath,
  appleWebApp: {
    capable: true,
    title: installTargets.public.appleTitle,
    statusBarStyle: 'default',
  },
  // Next n'émet que `mobile-web-app-capable` ; iOS antérieur à 16.4 attend
  // encore la variante préfixée pour lancer le raccourci en plein écran.
  other: { 'apple-mobile-web-app-capable': 'yes' },
  keywords: [
    'soins esthétiques Bulle',
    'institut de beauté Bulle',
    'épilation laser Bulle',
    'épilation laser Fribourg',
    'soins du visage Bulle',
    'onglerie Bulle',
    'microblading Fribourg',
    'endosphères therapy',
    'peelings visage',
    'esthéticienne Bulle',
  ],
  authors: [{ name: 'Noé Henchoz', url: 'https://henchoznoe.ch' }],
  creator: contact.name,
  publisher: contact.name,
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: 'Arbeauté | Soins esthétiques à Bulle',
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arbeauté | Soins esthétiques à Bulle',
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      {
        url: '/favicon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
    apple: '/favicon/apple-touch-icon.png',
    shortcut: '/favicon/favicon.ico',
    other: [
      {
        rel: 'mask-icon',
        url: '/favicon/safari-pinned-tab.svg',
        color: siteConfig.themeColor,
      },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
}

/**
 * Chrome émet `beforeinstallprompt` dès le chargement, souvent avant
 * l'hydratation de <InstallPrompt />. Ce script conserve l'évènement pour
 * que la bannière puisse encore déclencher l'installation.
 */
const captureInstallPrompt =
  "window.__pwaInstallPrompt=null;addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaInstallPrompt=e;dispatchEvent(new Event('pwa:installable'))});"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const openingHours = await getOpeningHours()

  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn('antialiased', inter.variable, playfair.variable)}
    >
      <body suppressHydrationWarning>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: constante littérale, sans donnée externe.
          dangerouslySetInnerHTML={{ __html: captureInstallPrompt }}
        />
        <JsonLd data={createLocalBusinessJsonLd(openingHours)} />
        {children}
        {/*
          La bannière lit `usePathname()` pour savoir quelle application
          proposer ; sur une route à paramètre, cette valeur n'existe qu'à la
          requête. La laisser diffuser après le shell garde les pages
          prérendues, et elle n'apparaît de toute façon qu'après un délai.
        */}
        <Suspense fallback={null}>
          <InstallPrompt />
        </Suspense>
        <ServiceWorkerRegistration />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
