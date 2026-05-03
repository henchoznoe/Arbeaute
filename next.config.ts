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

const nextConfig: NextConfig = {
  allowedDevOrigins: [getLocalIp()],
  // Inline Vercel env vars at build time so client components can access them
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? '',
  },
}

export default nextConfig
