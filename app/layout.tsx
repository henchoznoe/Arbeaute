import '@fortawesome/fontawesome-svg-core/styles.css'

import { config } from '@fortawesome/fontawesome-svg-core'
import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'

import './globals.css'
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
  metadataBase: new URL('https://arbeaute-bulle.ch'),
  title: 'Arbeauté | Soins esthétiques à Bulle',
  description:
    'À Bulle, Arbeauté vous propose un large éventail de soins esthétiques : épilation laser, soins du visage, onglerie, microblading, endosphère therapy et bien plus encore.',
  keywords: [
    'soins esthétiques',
    'Bulle',
    'épilation laser',
    'soins du visage',
    'onglerie',
    'microblading',
    'endosphère',
    'peelings',
    'beauté',
    'Fribourg',
  ],
  authors: [{ name: 'Noé Henchoz', url: 'https://henchoznoe.ch' }],
  openGraph: {
    type: 'website',
    locale: 'fr_CH',
    url: 'https://arbeaute-bulle.ch',
    siteName: 'Arbeauté',
    title: 'Arbeauté | Soins esthétiques à Bulle',
    description:
      'Soins esthétiques professionnels à Bulle : épilation laser, soins du visage, onglerie, microblading et plus.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arbeauté | Soins esthétiques à Bulle',
    description:
      'Soins esthétiques professionnels à Bulle : épilation laser, soins du visage, onglerie, microblading et plus.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://arbeaute-bulle.ch',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn('antialiased', inter.variable, playfair.variable)}
    >
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
