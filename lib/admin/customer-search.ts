import { normalizeCustomerSearchName } from '@/lib/reservation/customers'
import type { Prisma, PrismaClient } from '@/prisma/generated/prisma/client'

const ADMIN_CUSTOMER_PAGE_SIZE = 20
const MAX_ADMIN_CUSTOMER_PAGE = 500

/**
 * Les numéros sont enregistrés au format E.164 — `+41791234567` — alors qu'ils
 * se lisent `079 123 45 67` sur un téléphone et se dictent ainsi. Le zéro
 * initial est le préfixe national : le retirer fait de la saisie d'Arzu un
 * fragment du numéro enregistré, et « 079 » retrouve enfin quelqu'un.
 */
const toSearchablePhoneDigits = (query: string): string =>
  query.replace(/\D/g, '').replace(/^0+/, '')

/**
 * Les trois façons dont Arzu retrouve quelqu'un : le nom qu'elle a en tête,
 * l'adresse lue sur un e-mail, ou le numéro affiché par son téléphone.
 *
 * Partagé avec le sélecteur du formulaire de rendez-vous : deux recherches qui
 * ne trouveraient pas les mêmes personnes seraient un piège.
 */
export const buildCustomerSearchWhere = (
  query: string,
): Prisma.CustomerWhereInput => {
  const trimmed = query.trim()
  const base: Prisma.CustomerWhereInput = { anonymizedAt: null }
  if (!trimmed) return base
  const phoneDigits = toSearchablePhoneDigits(trimmed)
  return {
    ...base,
    OR: [
      { searchName: { contains: normalizeCustomerSearchName(null, trimmed) } },
      { emailNormalized: { contains: trimmed.toLowerCase() } },
      ...(phoneDigits.length >= 2
        ? [{ phoneNormalized: { contains: phoneDigits } }]
        : []),
    ],
  }
}

const customerResultSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  lastSeenAt: true,
  _count: { select: { appointments: true } },
} satisfies Prisma.CustomerSelect

type AdminCustomerSearchResult = Prisma.CustomerGetPayload<{
  select: typeof customerResultSelect
}>

export interface AdminCustomerSearchPage {
  customers: AdminCustomerSearchResult[]
  page: number
  totalPages: number
  totalCount: number
}

/**
 * Trié par dernière activité : une recherche vide affiche donc les derniers
 * clients vus, ce qui rend l'écran utile avant même d'avoir tapé une lettre.
 */
export const getAdminCustomerSearchPage = async (
  database: PrismaClient,
  { query, page }: { query: string; page: number },
): Promise<AdminCustomerSearchPage> => {
  const where = buildCustomerSearchWhere(query)
  const totalCount = await database.customer.count({ where })
  const totalPages = Math.max(
    1,
    Math.min(
      MAX_ADMIN_CUSTOMER_PAGE,
      Math.ceil(totalCount / ADMIN_CUSTOMER_PAGE_SIZE),
    ),
  )
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const customers = await database.customer.findMany({
    where,
    orderBy: [{ lastSeenAt: 'desc' }, { id: 'asc' }],
    skip: (currentPage - 1) * ADMIN_CUSTOMER_PAGE_SIZE,
    take: ADMIN_CUSTOMER_PAGE_SIZE,
    select: customerResultSelect,
  })
  return { customers, page: currentPage, totalPages, totalCount }
}
