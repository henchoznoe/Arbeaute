const localHosts = new Set(['127.0.0.1', 'localhost', '::1'])

const globalSetup = () => {
  if (process.env.E2E_ALLOW_MUTATIONS !== 'true')
    throw new Error(
      'La recette E2E avec mutations exige E2E_ALLOW_MUTATIONS=true.',
    )

  const appUrl = new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3100',
  )
  const databaseUrl = new URL(process.env.DATABASE_URL ?? '')
  const isolatedDatabase = /(?:^|_)(?:ci|e2e)$/.test(
    databaseUrl.pathname.slice(1),
  )

  if (
    !localHosts.has(appUrl.hostname) ||
    !localHosts.has(databaseUrl.hostname) ||
    !isolatedDatabase
  )
    throw new Error(
      'La recette E2E refuse toute application ou base non locale et non isolée.',
    )
}

export default globalSetup
