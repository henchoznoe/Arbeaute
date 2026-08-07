import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/config/site'

const manifest = (): MetadataRoute.Manifest => ({
  name: siteConfig.name,
  short_name: siteConfig.shortName,
  description: siteConfig.description,
  start_url: '/',
  display: 'standalone',
  background_color: siteConfig.backgroundColor,
  theme_color: siteConfig.themeColor,
  lang: siteConfig.language,
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
})

export default manifest
