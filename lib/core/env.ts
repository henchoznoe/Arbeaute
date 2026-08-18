import { z } from 'zod/v4'

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
})

const serverSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_UNPOOLED: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(12),
  ADMIN_SESSION_SECRET: z.string().min(32),
  CUSTOMER_SESSION_SECRET: z.string().min(32),
  BLOB_STORE_ID: z.string().min(1),
  BLOB_WEBHOOK_PUBLIC_KEY: z.string().min(1),
  // Optionnelles à dessein, et volontairement permissives : une adresse
  // d'expéditeur mal formée doit désactiver les e-mails, jamais empêcher le
  // site de démarrer. `RESEND_FROM` accepte la forme « Nom <adresse> », qui
  // est celle qu'attend Resend.
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z.string().min(3).optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().min(3).optional(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
})

interface EnvIssue {
  path: PropertyKey[]
  message: string
}

export const formatEnvErrors = (issues: EnvIssue[]): string =>
  issues
    .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')

const isServer = typeof window === 'undefined'

const parsedClient = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
})

const parsedServer = isServer
  ? serverSchema.safeParse(process.env)
  : { success: true as const, data: {} as z.infer<typeof serverSchema> }

if (!parsedClient.success || !parsedServer.success) {
  const clientErrors = parsedClient.success ? [] : parsedClient.error.issues
  const serverErrors = parsedServer.success ? [] : parsedServer.error.issues
  const summary = formatEnvErrors([...clientErrors, ...serverErrors])

  throw new Error(`Invalid environment configuration:\n${summary}`)
}

type Env = z.infer<typeof clientSchema> & z.infer<typeof serverSchema>

export const env = {
  ...parsedClient.data,
  ...(parsedServer.data as z.infer<typeof serverSchema>),
} as Env

/**
 * Une adresse exploitable, sous la forme `adresse@domaine` ou
 * `Nom <adresse@domaine>`. Volontairement tolérant : la validation fine
 * appartient à Resend, pas au démarrage de l'application.
 */
export const looksLikeEmailAddress = (value: string | undefined): boolean => {
  if (!value) return false
  const address = value.includes('<')
    ? (value.match(/<([^>]+)>/)?.[1] ?? '')
    : value
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim())
}

/** L'envoi d'e-mails n'est actif que si la clé et l'expéditeur sont utilisables. */
export const isEmailConfigured =
  Boolean(env.RESEND_API_KEY) && looksLikeEmailAddress(env.RESEND_FROM)

export const isProd = env.NODE_ENV === 'production'
export const isDev = env.NODE_ENV === 'development'
