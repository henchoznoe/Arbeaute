import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { AdminFocusRefresh } from '@/components/admin/admin-focus-refresh'
import {
  AdminContent,
  AdminNavigation,
} from '@/components/admin/admin-navigation'
import { Skeleton, skeletonKeys } from '@/components/ui/skeleton'
import { getAdminAttentionSummary } from '@/lib/admin/attention'
import { installTargets } from '@/lib/config/pwa'
import { getAdminSession } from '@/lib/core/session-cookies'

const admin = installTargets.admin

const AdminAttentionBadge = async () => {
  const { totalCount } = await getAdminAttentionSummary()
  if (totalCount <= 0) return null
  const label = totalCount > 99 ? '99+' : totalCount.toString()

  return (
    <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-brand-strong px-1 text-2xs font-bold leading-none text-ink-light ring-2 ring-background">
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">
        {totalCount} chose{totalCount > 1 ? 's' : ''} à traiter
      </span>
    </span>
  )
}

/** Réserve les deux repères sans révéler de lien avant le contrôle de session. */
const AdminNavigationFallback = () => (
  <>
    <header className="min-h-14 border-b px-4 sm:min-h-16 sm:px-8">
      <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between sm:min-h-16">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-11 w-24 rounded-lg" />
      </div>
    </header>
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto grid min-h-[4.25rem] max-w-lg grid-cols-5 items-center gap-2 px-2">
        {skeletonKeys(5).map(key => (
          <Skeleton key={key} className="mx-auto h-8 w-10 rounded-full" />
        ))}
      </div>
    </div>
  </>
)

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
  return (
    <>
      <AdminFocusRefresh />
      <AdminNavigation
        attentionBadge={
          <Suspense fallback={null}>
            <AdminAttentionBadge />
          </Suspense>
        }
      />
    </>
  )
}

const AdminLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <div className="min-h-screen bg-background">
    <Suspense fallback={<AdminNavigationFallback />}>
      <AuthenticatedAdminNavigation />
    </Suspense>
    <AdminContent>{children}</AdminContent>
  </div>
)

export default AdminLayout
