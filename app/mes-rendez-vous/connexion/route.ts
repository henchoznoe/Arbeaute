import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/core/prisma'
import { setCustomerSession } from '@/lib/core/session-cookies'
import { normalizeEmail } from '@/lib/reservation/identity'
import { MANAGE_EMAIL_PARAM, MANAGE_PATH } from '@/lib/reservation/manage-link'
import { checkRateLimit } from '@/lib/services/rate-limit'
import { getRequestIp } from '@/lib/utils/request'

/**
 * Ouvre « Mes rendez-vous » depuis un lien d'e-mail, sans ressaisie.
 *
 * Un gestionnaire de route et non une page : `cookies().set()` n'est autorisé
 * que dans une action serveur ou une route, jamais pendant le rendu d'une page.
 * C'est aussi ce qui permet de rediriger **avant** tout rendu, donc sans que
 * l'adresse n'atteigne la barre d'adresse ni le `Referer`.
 *
 * **Pas de contrôle d'origine ici, délibérément.** Une navigation depuis un
 * client de messagerie n'envoie pas d'en-tête `Origin` : l'exiger reviendrait à
 * refuser tout le monde. La limite de débit est donc le seul garde-fou, et elle
 * n'est pas décorative : les analyseurs de courrier des entreprises visitent
 * chaque URL d'un message reçu.
 *
 * Les trois issues mènent à un écran déjà connu, et une adresse inconnue est
 * indiscernable d'une limite atteinte.
 */
export const GET = async (request: NextRequest): Promise<never> => {
  const value = request.nextUrl.searchParams.get(MANAGE_EMAIL_PARAM)
  if (!value || value.length > 254) redirect(`${MANAGE_PATH}?error=invalid`)

  const limit = await checkRateLimit({
    action: 'customer-magic-link',
    key: await getRequestIp(),
    limit: 10,
    windowMs: 15 * 60 * 1000,
  })
  if (!limit.allowed) redirect(`${MANAGE_PATH}?error=invalid`)

  const customer = await prisma.customer.findFirst({
    where: { emailNormalized: normalizeEmail(value), anonymizedAt: null },
    select: { id: true, identityVersion: true },
  })
  if (!customer) redirect(`${MANAGE_PATH}?error=invalid`)

  await setCustomerSession(customer.id, customer.identityVersion)
  redirect(MANAGE_PATH)
}
