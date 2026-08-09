import type { Metadata, Viewport } from 'next'
import { installTargets } from '@/lib/config/pwa'

const admin = installTargets.admin

/**
 * Ce layout ne fait que basculer les métadonnées PWA : sous `/admin`, le
 * `<link rel="manifest">` du layout racine est remplacé par le manifeste
 * admin, si bien que « Ajouter à l'écran d'accueil » installe la console
 * et non la vitrine.
 */
export const metadata: Metadata = {
  title: {
    default: 'Administration',
    template: '%s | Arbeauté Admin',
  },
  manifest: admin.manifestPath,
  applicationName: admin.appleTitle,
  appleWebApp: {
    capable: true,
    title: admin.appleTitle,
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      {
        url: '/favicon/admin/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      { url: admin.icon, sizes: '192x192', type: 'image/png' },
    ],
    apple: '/favicon/admin/apple-touch-icon.png',
  },
  other: { 'apple-mobile-web-app-capable': 'yes' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: admin.manifest.theme_color,
}

const AdminLayout = ({ children }: Readonly<{ children: React.ReactNode }>) =>
  children

export default AdminLayout
