'use client'

import { Download, Share, SquarePlus, X } from 'lucide-react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { type InstallVariant, installTargets } from '@/lib/config/pwa'
import {
  INSTALLABLE_EVENT,
  isIos,
  isSilenced,
  isStandalone,
  rememberDismissal,
  SHOW_INSTALL_EVENT,
} from '@/lib/pwa/install'

type Mode = 'hidden' | 'prompt' | 'ios'

/**
 * Bannière d'installation, montée une seule fois dans le layout racine.
 * La variante se déduit de l'URL : sous `/admin`, c'est le manifeste admin
 * qui est lié à la page, donc l'installation vise bien la console.
 */
export const InstallPrompt = () => {
  const pathname = usePathname()
  const variant: InstallVariant = pathname.startsWith('/admin')
    ? 'admin'
    : 'public'
  const target = installTargets[variant]

  const [mode, setMode] = useState<Mode>('hidden')

  useEffect(() => {
    setMode('hidden')
    if (isStandalone()) return

    let timer: ReturnType<typeof setTimeout> | undefined
    const showLater = () => {
      clearTimeout(timer)
      timer = setTimeout(
        () => setMode(isIos() ? 'ios' : 'prompt'),
        target.delayMs,
      )
    }

    // Demande explicite depuis le bouton « Installer l'app » : on ignore
    // le délai comme un éventuel refus précédent.
    const showNow = () => setMode(isIos() ? 'ios' : 'prompt')
    const onInstalled = () => {
      setMode('hidden')
      rememberDismissal(target.dismissKey)
    }

    window.addEventListener(SHOW_INSTALL_EVENT, showNow)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener(INSTALLABLE_EVENT, showLater)

    if (!isSilenced(target.dismissKey, target.dismissDays)) {
      if (isIos() || window.__pwaInstallPrompt) showLater()
    }

    return () => {
      clearTimeout(timer)
      window.removeEventListener(SHOW_INSTALL_EVENT, showNow)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener(INSTALLABLE_EVENT, showLater)
    }
  }, [target])

  const dismiss = useCallback(() => {
    rememberDismissal(target.dismissKey)
    setMode('hidden')
  }, [target])

  const install = useCallback(async () => {
    const event = window.__pwaInstallPrompt
    if (!event) return dismiss()

    window.__pwaInstallPrompt = null
    setMode('hidden')

    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'dismissed') rememberDismissal(target.dismissKey)
  }, [dismiss, target])

  if (mode === 'hidden') return null

  return (
    <section
      data-install-prompt
      aria-label="Installer l’application"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-md animate-in gap-4 rounded-2xl border bg-card/95 p-4 shadow-2xl shadow-black/10 backdrop-blur-lg duration-500 fade-in slide-in-from-bottom-8">
        <Image
          src={target.icon}
          alt=""
          width={192}
          height={192}
          // Icône PNG de 192 px affichée en 48 : l'optimiser coûterait des
          // transformations pour un gain de poids négligeable.
          unoptimized
          className="size-12 shrink-0 self-start rounded-lg shadow-sm"
        />

        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-bold">{target.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {target.description}
          </p>

          {mode === 'ios' ? (
            <ol className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Share className="size-4 shrink-0 text-rose-500" />
                <span>
                  Appuyez sur <strong className="font-medium">Partager</strong>{' '}
                  dans la barre du navigateur
                </span>
              </li>
              <li className="flex items-center gap-2">
                <SquarePlus className="size-4 shrink-0 text-rose-500" />
                <span>
                  Choisissez{' '}
                  <strong className="font-medium">Sur l’écran d’accueil</strong>
                </span>
              </li>
            </ol>
          ) : (
            <Button
              type="button"
              onClick={install}
              size="lg"
              className="mt-3 h-9 rounded-full px-4"
            >
              <Download className="size-4" />
              Installer
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Masquer cette proposition"
          className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center self-start rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </section>
  )
}
