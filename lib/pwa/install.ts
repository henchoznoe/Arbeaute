/**
 * Utilitaires navigateur partagés par la bannière d'installation et le
 * bouton « Installer l'app ». Ces fonctions supposent un contexte client.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    /** Évènement capturé par le script inline du layout racine. */
    __pwaInstallPrompt: BeforeInstallPromptEvent | null
  }
}

/** Émis par le script inline dès que Chrome autorise l'installation. */
export const INSTALLABLE_EVENT = 'pwa:installable'

/** Émis par le bouton « Installer l'app » pour rouvrir la bannière. */
export const SHOW_INSTALL_EVENT = 'pwa:show-install'

/**
 * La bannière s'ouvrait selon le chemin, sans jamais se demander si le moment
 * était bon : elle recouvrait la liste des prestations pendant le choix, et
 * s'affichait sur `/admin/login`, c'est-à-dire avant que quiconque soit
 * identifié.
 *
 * Elle ne s'invite plus que sur la page d'accueil, et sur les écrans
 * d'administration déjà ouverts. Le bouton du pied de page, lui, la fait
 * apparaître partout et à la demande : c'est le geste de quelqu'un qui la
 * cherche, pas une interruption.
 */
export const invitesInstall = (pathname: string): boolean =>
  pathname.startsWith('/admin') ? pathname !== '/admin/login' : pathname === '/'

const DAY_MS = 86_400_000

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // Safari iOS n'implémente pas `display-mode`, mais expose ce drapeau.
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/**
 * iOS n'expose aucune API d'installation : il faut guider la personne vers
 * le menu Partager. iPadOS s'annonçant comme macOS, on le distingue par la
 * présence d'un écran tactile.
 */
export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export const rememberDismissal = (key: string) => {
  try {
    window.localStorage.setItem(key, String(Date.now()))
  } catch {
    // Navigation privée : la bannière réapparaîtra, sans conséquence.
  }
}

export const isSilenced = (key: string, days: number) => {
  let dismissedAt = Number.NaN
  try {
    dismissedAt = Number(window.localStorage.getItem(key))
  } catch {
    return false
  }

  return (
    Number.isFinite(dismissedAt) &&
    dismissedAt > 0 &&
    Date.now() - dismissedAt < days * DAY_MS
  )
}
