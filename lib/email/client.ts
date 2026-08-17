import { env } from '@/lib/core/env'

/**
 * Transport Resend, en `fetch` direct sur l'API REST.
 *
 * Aucune dépendance ajoutée : le SDK n'apporterait qu'un wrapper autour d'un
 * POST, sur un projet qui compte ses kilo-octets. Le transport ne connaît que
 * l'enveloppe — destinataire, objet, corps — et rien du domaine.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const REQUEST_TIMEOUT_MS = 10_000

export interface MailEnvelope {
  to: string
  subject: string
  text: string
  html: string
}

export type MailResult =
  | { ok: true; providerId: string | null }
  | { ok: false; error: string }

export const sendMailThroughResend = async (
  envelope: MailEnvelope,
): Promise<MailResult> => {
  const apiKey = env.RESEND_API_KEY
  const from = env.RESEND_FROM
  if (!apiKey || !from)
    return { ok: false, error: 'Envoi désactivé : clé Resend absente.' }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [envelope.to],
        subject: envelope.subject,
        text: envelope.text,
        html: envelope.html,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return {
        ok: false,
        error: `Resend a répondu ${response.status}. ${detail}`
          .trim()
          .slice(0, 500),
      }
    }

    const payload = (await response.json().catch(() => null)) as {
      id?: string
    } | null
    return { ok: true, providerId: payload?.id ?? null }
  } catch (error) {
    const reason =
      error instanceof Error && error.name === 'AbortError'
        ? 'Resend n’a pas répondu dans les dix secondes.'
        : error instanceof Error
          ? error.message
          : 'Erreur inconnue.'
    return { ok: false, error: reason.slice(0, 500) }
  } finally {
    clearTimeout(timeout)
  }
}
