'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface SiteHeaderProps {
  links?: { href: string; label: string }[]
  actions?: ReactNode
  className?: string
}

export const SiteHeader = ({
  links = [],
  actions,
  className,
}: Readonly<SiteHeaderProps>) => {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  // La vitrine compte désormais plusieurs pages : sans repère, on ne sait plus
  // où l'on est. `/` ne vaut que pour lui-même, sinon toutes les pages
  // seraient actives en même temps.
  const isCurrent = (href: string): boolean =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 h-16 border-b border-foreground/10 bg-background/70 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60',
        className,
      )}
    >
      <div className="mx-auto grid h-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
        <Link
          href="/"
          className="justify-self-start font-heading text-xl font-bold"
        >
          Arbeauté
        </Link>

        <div className="justify-self-center">
          {links.length > 0 ? (
            <nav className="hidden items-center gap-8 text-sm font-medium sm:flex">
              {links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isCurrent(link.href) ? 'page' : undefined}
                  className={cn(
                    'transition-colors hover:text-brand',
                    isCurrent(link.href) &&
                      'text-brand underline decoration-2 underline-offset-8',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="flex items-center justify-self-end gap-3">
          {actions}
          {links.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(value => !value)}
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={open}
              className="rounded-full sm:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          ) : null}
        </div>
      </div>

      {open && links.length > 0 ? (
        <nav className="flex flex-col gap-1 border-t border-foreground/10 bg-background px-4 py-3 shadow-lg sm:hidden">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={isCurrent(link.href) ? 'page' : undefined}
              className={cn(
                'rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted',
                isCurrent(link.href) && 'bg-brand-subtle text-brand-strong',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  )
}
