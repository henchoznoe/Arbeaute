import { installTargets } from '@/lib/config/pwa'

/**
 * Servi par une route plutôt que par la convention `app/manifest.ts` :
 * celle-ci injecte un `<link rel="manifest">` global qui ne peut pas être
 * remplacé par le manifeste admin dans `app/admin/layout.tsx`.
 *
 * Le manifeste étant une constante du module, la route est prérendue.
 */
export const GET = () =>
  Response.json(installTargets.public.manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
