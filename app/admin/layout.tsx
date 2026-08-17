import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import {
  AdminContent,
  AdminNavigation,
} from '@/components/admin/admin-navigation'
import { getUnreadActivityCount } from '@/lib/admin/activity'
import { installTargets } from '@/lib/config/pwa'
import { getAdminSession } from '@/lib/core/session-cookies'

const admin = installTargets.admin

/**
 * Sous `/admin`, le `<link rel="manifest">` du layout racine est remplacé par
 * le manifeste admin, si bien que « Ajouter à l'écran d'accueil » installe la
 * console et non la vitrine. La navigation reste commune à tous les écrans
 * authentifiés, tandis que la connexion conserve sa présentation isolée.
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

const AuthenticatedAdminNavigation = async () => {
  if (!(await getAdminSession())) return null
  const unreadActivityCount = await getUnreadActivityCount()
  return <AdminNavigation unreadActivityCount={unreadActivityCount} />
}

const AdminLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <div className="min-h-screen bg-background">
    <Suspense>
      <AuthenticatedAdminNavigation />
    </Suspense>
    <AdminContent>{children}</AdminContent>
  </div>
)

export default AdminLayout
