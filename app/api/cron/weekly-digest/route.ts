import { after } from 'next/server'
import { env } from '@/lib/core/env'
import { runWeeklyDigest } from '@/lib/email/weekly-run'

/**
 * Bilan hebdomadaire, déclenché par le cron Vercel du dimanche soir.
 *
 * Vercel envoie `Authorization: Bearer $CRON_SECRET` sur les routes déclarées
 * dans `vercel.json`. Sans secret configuré, la route refuse tout : mieux vaut
 * une tâche muette qu'un point d'entrée ouvert.
 *
 * Le travail passe par `after()` pour répondre tout de suite : une tâche qui
 * expire côté plateforme ne doit pas relancer l'envoi une seconde fois.
 */
export const GET = async (request: Request): Promise<Response> => {
  const secret = env.CRON_SECRET
  if (!secret) return new Response('Tâche non configurée.', { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`)
    return new Response('Non autorisé.', { status: 401 })

  after(async () => {
    await runWeeklyDigest()
  })

  return Response.json({ accepted: true })
}
