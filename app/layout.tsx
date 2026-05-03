/**
 * File: app/globals.css
 * Description: Global styles for the application.
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { Geist_Mono, Inter } from 'next/font/google'

import './globals.css'
import { cn } from '@/lib/utils/cn'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        'antialiased',
        fontMono.variable,
        'font-sans',
        inter.variable,
      )}
    >
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
