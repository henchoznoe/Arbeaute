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
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
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

export const isProd = env.NODE_ENV === 'production'
export const isDev = env.NODE_ENV === 'development'
