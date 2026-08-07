import '@fortawesome/fontawesome-svg-core/styles.css'

import { config } from '@fortawesome/fontawesome-svg-core'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'

import './globals.css'
import { JsonLd } from '@/components/seo/json-ld'
import { createLocalBusinessJsonLd } from '@/lib/config/seo'
import { siteConfig } from '@/lib/config/site'
import { contact } from '@/lib/constants/contact'
import { getOpeningHours } from '@/lib/reservation/opening-hours'
import { cn } from '@/lib/utils/cn'

config.autoAddCss = false

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
    ],
    apple: '/favicon/apple-touch-icon.png',
    shortcut: '/favicon/favicon.ico',
  },
}

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
        <JsonLd data={createLocalBusinessJsonLd(openingHours)} />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
