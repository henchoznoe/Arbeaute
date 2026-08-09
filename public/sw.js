/*
 * Service worker minimal.
 *
 * Son unique rôle est de rendre le site installable : Chrome n'émet
 * `beforeinstallprompt` (et n'affiche « Installer l'application ») que si
 * un service worker répond aux navigations hors ligne.
 *
 * Volontairement sans cache de contenu : l'agenda admin et les
 * disponibilités doivent toujours refléter la base. On se contente de
 * laisser passer le réseau et de servir une page de repli quand il est
 * indisponible.
 */

const CACHE = 'arbeaute-offline-v1'
const OFFLINE_URL = '/offline'

const cacheOfflinePage = () =>
  caches
    .open(CACHE)
    .then(cache => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))

self.addEventListener('install', event => {
  event.waitUntil(cacheOfflinePage().then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

/**
 * Ce fichier ne changeant jamais d'un déploiement à l'autre, `install` ne
 * serait rejoué qu'à la première visite : la page de repli en cache
 * référencerait indéfiniment les bundles d'une ancienne version. On la
 * rafraîchit donc une fois par démarrage du worker.
 */
let offlinePageRefreshed = false

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET' || request.mode !== 'navigate') return

  if (!offlinePageRefreshed) {
    offlinePageRefreshed = true
    event.waitUntil(cacheOfflinePage().catch(() => undefined))
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL)
      return cached ?? Response.error()
    }),
  )
})
