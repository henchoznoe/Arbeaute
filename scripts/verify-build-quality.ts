import { statSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const nextDirectory = path.resolve('.next')
const publicDirectory = path.resolve('public')

const publicRoutes = [
  '/',
  '/conditions-generales',
  '/mentions-legales',
  '/mes-rendez-vous',
  '/offline',
  '/politique-de-confidentialite',
  '/reservation',
] as const

const routeJavascriptBudgets = {
  '/': 450 * 1024,
  '/mes-rendez-vous': 500 * 1024,
  '/reservation': 650 * 1024,
} as const

const imageExtensions = new Set([
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.webp',
])
const maximumImageBytes = 256 * 1024
const maximumPublicImagesBytes = 450 * 1024

const formatKiB = (bytes: number): string => `${Math.ceil(bytes / 1024)} Kio`

const readJson = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(file, 'utf8')) as T

const listFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(entry => {
      const target = path.join(directory, entry.name)
      return entry.isDirectory() ? listFiles(target) : Promise.resolve([target])
    }),
  )
  return nested.flat()
}

const getRouteManifestPath = (route: string): string => {
  const routeDirectory = route === '/' ? '' : route.slice(1)
  return path.join(
    nextDirectory,
    'server/app',
    routeDirectory,
    'page_client-reference-manifest.js',
  )
}

const getRouteJavascriptBytes = async (route: string): Promise<number> => {
  const source = await readFile(getRouteManifestPath(route), 'utf8')
  const assignments = [
    ...source.matchAll(/globalThis\.__RSC_MANIFEST\[[^\n]+?\]\s*=\s*/g),
  ]
  const assignment = assignments.at(-1)
  if (!assignment || assignment.index === undefined)
    throw new Error(`Manifeste client illisible pour la route ${route}.`)

  const jsonStart = assignment.index + assignment[0].length
  const jsonEnd = source.lastIndexOf(';')
  const manifest = JSON.parse(source.slice(jsonStart, jsonEnd)) as {
    clientModules: Record<string, { chunks: Array<number | string> }>
  }
  const chunks = new Set(
    Object.values(manifest.clientModules)
      .flatMap(module => module.chunks)
      .filter(
        (chunk): chunk is string =>
          typeof chunk === 'string' && chunk.endsWith('.js'),
      ),
  )

  return [...chunks].reduce(
    (total, chunk) =>
      total +
      statSync(path.join(nextDirectory, chunk.replace(/^\/_next\//, ''))).size,
    0,
  )
}

const verifyPrerenderedRoutes = async (): Promise<void> => {
  const manifest = await readJson<{ routes: Record<string, unknown> }>(
    path.join(nextDirectory, 'prerender-manifest.json'),
  )
  const missing = publicRoutes.filter(route => !(route in manifest.routes))
  if (missing.length)
    throw new Error(
      `Routes publiques sans coquille prérendue : ${missing.join(', ')}.`,
    )
  console.info(`✓ ${publicRoutes.length} routes publiques restent prérendues`)
}

const verifyJavascriptBudgets = async (): Promise<void> => {
  for (const [route, budget] of Object.entries(routeJavascriptBudgets)) {
    const bytes = await getRouteJavascriptBytes(route)
    if (bytes > budget)
      throw new Error(
        `${route} charge ${formatKiB(bytes)} de JavaScript pour un budget de ${formatKiB(budget)}.`,
      )
    console.info(
      `✓ JavaScript ${route} : ${formatKiB(bytes)} / ${formatKiB(budget)}`,
    )
  }
}

const verifyImageBudgets = async (): Promise<void> => {
  const images = (await listFiles(publicDirectory)).filter(file =>
    imageExtensions.has(path.extname(file).toLowerCase()),
  )
  const oversized = images.filter(
    file => statSync(file).size > maximumImageBytes,
  )
  if (oversized.length)
    throw new Error(
      `Images au-dessus de ${formatKiB(maximumImageBytes)} : ${oversized
        .map(file => path.relative(publicDirectory, file))
        .join(', ')}.`,
    )

  const total = images.reduce((sum, file) => sum + statSync(file).size, 0)
  if (total > maximumPublicImagesBytes)
    throw new Error(
      `Les images publiques pèsent ${formatKiB(total)} pour un budget de ${formatKiB(maximumPublicImagesBytes)}.`,
    )
  console.info(
    `✓ Images publiques : ${formatKiB(total)} / ${formatKiB(maximumPublicImagesBytes)}`,
  )
}

const main = async () => {
  await verifyPrerenderedRoutes()
  await verifyJavascriptBudgets()
  await verifyImageBudgets()
}

main().catch(error => {
  console.error(error instanceof Error ? `✗ ${error.message}` : error)
  process.exitCode = 1
})
