import { installTargets } from '@/lib/config/pwa'

/**
 * Manifeste de l'application admin : `id`, `scope` et `start_url` pointent
 * sur `/admin`, ce qui en fait une application installable distincte de la
 * vitrine et garantit que le raccourci ouvre bien la console.
 *
 * Accessible sans session : les navigateurs récupèrent le manifeste sans
 * envoyer les cookies (`credentials: omit`), d'où l'exception dans
 * `proxy.ts`.
 */
export const dynamic = 'force-static'

export const GET = () =>
  Response.json(installTargets.admin.manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
