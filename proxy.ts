import { type NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/core/session'
import { ADMIN_COOKIE_NAME } from '@/lib/core/session-config'

export const proxy = async (request: NextRequest) => {
  if (request.nextUrl.pathname === '/admin/login') return NextResponse.next()

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
