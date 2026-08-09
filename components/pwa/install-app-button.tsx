'use client'

import { useEffect, useState } from 'react'

import {
  INSTALLABLE_EVENT,
  isIos,
  isStandalone,
  SHOW_INSTALL_EVENT,
} from '@/lib/pwa/install'
import { cn } from '@/lib/utils/cn'

interface InstallAppButtonProps {
  label?: string
  className?: string
}

/**
 * Point d'entrée permanent vers l'installation : la bannière peut avoir
 * été masquée, ce bouton la rouvre. Il disparaît quand l'application est
 * déjà installée ou que le navigateur ne sait pas l'installer.
 */
export const InstallAppButton = ({
  label = 'Installer l’app',
  className,
}: Readonly<InstallAppButtonProps>) => {
  const [installable, setInstallable] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setInstallable(
        !isStandalone() && (isIos() || Boolean(window.__pwaInstallPrompt)),
      )
    }

    refresh()
    window.addEventListener(INSTALLABLE_EVENT, refresh)
    window.addEventListener('appinstalled', refresh)

    return () => {
      window.removeEventListener(INSTALLABLE_EVENT, refresh)
      window.removeEventListener('appinstalled', refresh)
    }
  }, [])

  if (!installable) return null

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(SHOW_INSTALL_EVENT))}
      className={cn(
        'underline underline-offset-2 transition-colors hover:text-foreground',
        className,
      )}
    >
      {label}
    </button>
  )
}
