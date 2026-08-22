import { env } from '@/lib/core/env'
import { runAppointmentReminders } from '@/lib/email/reminder-run'

export const maxDuration = 60

/** Rappels du matin, protégés par le même secret que le bilan hebdomadaire. */
export const GET = async (request: Request): Promise<Response> => {
  const secret = env.CRON_SECRET
  if (!secret) return new Response('Tâche non configurée.', { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`)
    return new Response('Non autorisé.', { status: 401 })

  // Personne n'attend cet endpoint : attendre permet au journal Vercel de dire
  // ce qui est réellement parti, sans exposer le moindre nom ni destinataire.
  return Response.json(await runAppointmentReminders())
}
