import { type NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/core/session'
import { ADMIN_COOKIE_NAME } from '@/lib/core/session-config'

/**
 * Chemins d'`/admin` servis sans session : la page de connexion, et le
 * manifeste PWA que les navigateurs récupèrent sans cookies
 * (`credentials: omit`) — le rediriger casserait l'installation de l'app.
 */
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/manifest.webmanifest']

export const proxy = async (request: NextRequest) => {
  if (PUBLIC_ADMIN_PATHS.includes(request.nextUrl.pathname))
    return NextResponse.next()

  const session = await verifySessionToken(
    request.cookies.get(ADMIN_COOKIE_NAME)?.value,
    process.env.ADMIN_SESSION_SECRET ?? '',
    'admin',
  )

  if (session) return NextResponse.next()

  const loginUrl = new URL('/admin/login', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*'],
}
