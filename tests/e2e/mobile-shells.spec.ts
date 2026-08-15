import { expect, type Page, test } from '@playwright/test'

interface WebVitals {
  cls: number
  imageBytes: number
  javascriptBytes: number
  lcp: number
}

const publicPages = [
  {
    path: '/',
    heading: /La beauté/,
  },
  {
    path: '/reservation?service=soin-visage-bio',
    heading: 'Choisissez votre créneau',
  },
  {
    path: '/mes-rendez-vous',
    heading: 'Mes rendez-vous',
  },
] as const

const prepareStablePage = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'arbeaute:install-dismissed:public',
      String(Date.now()),
    )
    localStorage.setItem('arbeaute:install-dismissed:admin', String(Date.now()))

    const vitals = { cls: 0, lcp: 0 }
    ;(
      window as typeof window & {
        __arbeauteVitals: typeof vitals
      }
    ).__arbeauteVitals = vitals

    new PerformanceObserver(list => {
      const latest = list.getEntries().at(-1)
      if (latest) vitals.lcp = latest.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })

    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean
          value: number
        }
        if (!shift.hadRecentInput) vitals.cls += shift.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
}

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  const horizontalScroll = await page.evaluate(() => {
    window.scrollTo({ left: 100, top: window.scrollY, behavior: 'instant' })
    return window.scrollX
  })
  expect(horizontalScroll).toBe(0)
}

const readWebVitals = async (page: Page): Promise<WebVitals> =>
  page.evaluate(() => {
    const resources = performance.getEntriesByType(
      'resource',
    ) as PerformanceResourceTiming[]
    const bytesFor = (initiatorType: string) =>
      resources
        .filter(resource => resource.initiatorType === initiatorType)
        .reduce(
          (sum, resource) =>
            sum + (resource.encodedBodySize || resource.transferSize),
          0,
        )
    const vitals = (
      window as typeof window & {
        __arbeauteVitals: { cls: number; lcp: number }
      }
    ).__arbeauteVitals

    return {
      ...vitals,
      imageBytes: bytesFor('img'),
      javascriptBytes: bytesFor('script'),
    }
  })

test.beforeEach(async ({ page }) => {
  await prepareStablePage(page)
})

for (const publicPage of publicPages) {
  test(`${publicPage.path} respecte la coquille mobile et les budgets web`, async ({
    page,
  }) => {
    await page.goto(publicPage.path, { waitUntil: 'networkidle' })
    await expect(
      page.getByRole('heading', { name: publicPage.heading }).first(),
    ).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.waitForTimeout(500)

    const vitals = await readWebVitals(page)
    expect(vitals.javascriptBytes).toBeLessThanOrEqual(700 * 1024)
    expect(vitals.imageBytes).toBeLessThanOrEqual(1_500 * 1024)
    expect(vitals.lcp).toBeGreaterThan(0)
    expect(vitals.lcp).toBeLessThanOrEqual(3_000)
    expect(vitals.cls).toBeLessThanOrEqual(0.1)
  })
}

test('la vitrine conserve sa référence visuelle mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveScreenshot('vitrine-mobile.png', {
    fullPage: false,
  })
})

test('la réservation profonde conserve sa référence visuelle mobile', async ({
  page,
}) => {
  await page.goto('/reservation?service=soin-visage-bio', {
    waitUntil: 'networkidle',
  })
  await expect(
    page.getByRole('heading', { name: 'Choisissez votre créneau' }),
  ).toBeVisible()
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Viewport mobile indisponible.')
  await expect(page).toHaveScreenshot('reservation-mobile.png', {
    clip: { x: 0, y: 0, width: viewport.width, height: 640 },
  })
})

test('l’espace admin reste utilisable sur mobile', async ({ page }) => {
  await page.goto('/admin')
  await expect(
    page.getByRole('heading', { name: 'Administration' }),
  ).toBeVisible()
  await expect(page.getByLabel('Mot de passe')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('les deux manifestes PWA gardent des identités et périmètres distincts', async ({
  request,
}) => {
  const publicManifest = await (
    await request.get('/manifest.webmanifest')
  ).json()
  const adminManifest = await (
    await request.get('/admin/manifest.webmanifest')
  ).json()

  expect(publicManifest).toMatchObject({
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
  })
  expect(adminManifest).toMatchObject({
    id: '/admin',
    start_url: '/admin',
    scope: '/admin',
    display: 'standalone',
  })
})

test('le mode installé ne repropose pas l’installation', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: true,
    })
  })
  await page.goto('/')
  await page.evaluate(() => window.dispatchEvent(new Event('pwa:show-install')))
  await expect(page.locator('[data-install-prompt]')).toHaveCount(0)
})

test('le mode hors ligne ne révèle que la page de repli', async ({
  context,
  page,
}) => {
  await page.goto('/offline')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) location.reload()
  })
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

  const cachedPaths = await page.evaluate(async () => {
    const requests = await Promise.all(
      (await caches.keys()).map(async cacheName =>
        (await caches.open(cacheName)).keys(),
      ),
    )
    return requests.flat().map(request => new URL(request.url).pathname)
  })
  expect(new Set(cachedPaths)).toEqual(new Set(['/offline']))

  await context.setOffline(true)
  try {
    await page.goto('/reservation?offline=1')
    await expect(
      page.getByRole('heading', { name: 'Pas de connexion' }),
    ).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
})
