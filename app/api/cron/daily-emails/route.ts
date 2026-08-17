import { after } from 'next/server'
import { env } from '@/lib/core/env'
import { runDailyEmails } from '@/lib/email/daily-run'

/**
 * Tâche quotidienne des e-mails, déclenchée par le cron Vercel.
 *
 * Vercel envoie `Authorization: Bearer $CRON_SECRET` sur les routes déclarées
 * dans `vercel.json`. Sans secret configuré, la route refuse tout : mieux vaut
 * un cron muet qu'un point d'entrée ouvert.
 *
 * Le travail passe par `after()` pour répondre tout de suite : un cron qui
 * expire côté plateforme ne doit pas relancer les envois une seconde fois.
 */
export const GET = async (request: Request): Promise<Response> => {
  const secret = env.CRON_SECRET
  if (!secret) return new Response('Cron non configuré.', { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`)
    return new Response('Non autorisé.', { status: 401 })

  after(async () => {
    await runDailyEmails()
  })

  return Response.json({ accepted: true })
}
