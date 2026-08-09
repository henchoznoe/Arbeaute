'use client'

import { useEffect } from 'react'

/**
 * Enregistre `public/sw.js`. C'est ce qui rend le site installable :
 * sans service worker répondant aux navigations, Chrome n'émet jamais
 * `beforeinstallprompt` et ne propose que le raccourci « bookmark », qui
 * ignore le `start_url` du manifeste.
 *
 * Désactivé hors production : le service worker interfèrerait avec le
 * rechargement à chaud du serveur de développement.
 */
export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(error => {
          console.error("Échec de l'enregistrement du service worker", error)
        })
    }

    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
