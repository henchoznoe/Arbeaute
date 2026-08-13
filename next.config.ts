/**
 * File: next.config.ts
 * Description: Next.js configuration options.
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import os from 'node:os'
import type { NextConfig } from 'next'

const getLocalIp = () => {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces))
    for (const iface of interfaces[name] ?? [])
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
  return '127.0.0.1'
}

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
] as const

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: [getLocalIp()],
  /**
   * Partial Prerendering par défaut : chaque route produit un shell statique
   * servi depuis le CDN, et seules les parties réellement dynamiques (session,
   * agenda, créneaux) sont rendues à la requête. C'est ce qui ramène les pages
   * publiques à zéro invocation de fonction.
   */
  cacheComponents: true,
  async headers() {
    return [{ source: '/(.*)', headers: [...securityHeaders] }]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.blob.vercel-storage.com',
      },
    ],
    /**
     * Vercel facture une transformation à chaque MISS *et* à chaque STALE du
     * cache image. Le défaut de Next 16 étant de 4 h, une même vignette serait
     * retransformée jusqu'à six fois par jour ; un an de TTL la ramène à une
     * transformation unique, ce qui compte face aux 5 000/mois du plan Hobby.
     */
    minimumCacheTTL: 31_536_000,
    /**
     * Largeurs réellement rendues : vignettes de prestations en 80/96 px,
     * portrait compact en 128 px et portrait « À propos » en 144/176 px. Les
     * visuels larges du hero et de la galerie passent par `deviceSizes` ; chaque
     * largeur en trop reste une transformation possible sur le plan Hobby.
     */
    imageSizes: [48, 96, 128, 192, 256, 384],
    deviceSizes: [640, 828, 1080, 1920],
  },
  // Inline Vercel env vars at build time so client components can access them
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? '',
  },
}

export default nextConfig
