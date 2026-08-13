'use client'

import { CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { navigationItemBaseClass } from '@/components/ui/navigation'

export const MobileBookingBar = () => {
  const [primaryActionVisible, setPrimaryActionVisible] = useState(true)
  const [installPromptVisible, setInstallPromptVisible] = useState(false)

  useEffect(() => {
    const actions = Array.from(
      document.querySelectorAll('[data-primary-booking-cta]'),
    )
    const visibility = new Map<Element, boolean>()
    const updateVisibility = () =>
      setPrimaryActionVisible([...visibility.values()].some(Boolean))
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries)
          visibility.set(entry.target, entry.isIntersecting)
        updateVisibility()
      },
      { threshold: 0.35 },
    )

    for (const action of actions) {
      visibility.set(action, false)
      observer.observe(action)
    }
    updateVisibility()

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const updateVisibility = () =>
      setInstallPromptVisible(
        document.querySelector('[data-install-prompt]') !== null,
      )
    const observer = new MutationObserver(updateVisibility)
    observer.observe(document.body, { childList: true, subtree: true })
    updateVisibility()

    return () => observer.disconnect()
  }, [])

  const hidden = primaryActionVisible || installPromptVisible

  return (
    <nav
      data-mobile-booking-bar
      aria-label="Actions de réservation"
      aria-hidden={hidden}
      className={`fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-lg transition duration-200 sm:hidden ${
        hidden
          ? 'pointer-events-none translate-y-full opacity-0'
          : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="mx-auto grid max-w-md grid-cols-[1fr_2fr] gap-2">
        <Link
          href="/mes-rendez-vous"
          aria-label="Mes rendez-vous"
          tabIndex={hidden ? -1 : undefined}
          className={`${navigationItemBaseClass} h-12 border bg-background px-3 text-center`}
        >
          Mes RDV
        </Link>
        <Link
          href="/reservation"
          tabIndex={hidden ? -1 : undefined}
          className={`${navigationItemBaseClass} h-12 gap-2 bg-primary px-4 text-primary-foreground`}
        >
          <CalendarDays className="size-4" />
          Réserver
        </Link>
      </div>
    </nav>
  )
}
