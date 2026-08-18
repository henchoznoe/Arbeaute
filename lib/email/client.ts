import { contact } from '@/lib/constants/contact'
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

export interface MailAttachment {
  filename: string
  /** Contenu encodé en base64, comme l'attend l'API Resend. */
  content: string
}

export interface MailEnvelope {
  to: string
  subject: string
  text: string
  html: string
  attachments?: MailAttachment[]
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
        // L'expéditeur est `noreply@arbeaute-bulle.ch`, qui ne reçoit rien.
        // `reply_to` fait atterrir « Répondre » sur la boîte qu'Arzu relève
        // réellement, sans qu'aucun renvoi n'ait à être monté chez l'hébergeur.
        reply_to: contact.email,
        subject: envelope.subject,
        text: envelope.text,
        html: envelope.html,
        ...(envelope.attachments?.length
          ? { attachments: envelope.attachments }
          : {}),
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
