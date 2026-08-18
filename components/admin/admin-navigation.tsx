'use client'

import {
  Activity,
  CalendarDays,
  CirclePlus,
  House,
  LogOut,
  Search,
  Settings2,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { navigationItemBaseClass } from '@/components/ui/navigation'
import { SubmitButton } from '@/components/ui/submit-button'
import { logoutAdmin } from '@/lib/actions/admin-auth'
import {
  ADMIN_AGENDA_DATE_EVENT,
  type AdminNavigationItem,
  getActiveAdminNavigationItem,
  getNewAppointmentHref,
} from '@/lib/admin/navigation'
import { getLocalDateKey } from '@/lib/reservation/time'

interface AdminNavigationProps {
  unreadActivityCount: number
}

export const AdminContent = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  const pathname = usePathname()
  return (
    <div
      className={
        pathname === '/admin/login'
          ? undefined
          : 'pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-0'
      }
    >
      {children}
    </div>
  )
}

/**
 * La pastille se pose sur le coin du bouton, pas sur l'icône : accrochée à
 * l'icône, elle en recouvrait le dessin et se lisait comme une rature.
 */
const activityBadge = (count: number, className: string) => {
  if (count <= 0) return null
  const label = count > 99 ? '99+' : count.toString()
  return (
    <span
      className={`absolute grid min-h-4 min-w-4 place-items-center rounded-full bg-brand-strong px-1 text-2xs font-bold leading-none text-white ring-2 ring-background ${className}`}
    >
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">
        {count} activité{count > 1 ? 's' : ''} non lue
        {count > 1 ? 's' : ''}
      </span>
    </span>
  )
}

export const AdminNavigation = ({
  unreadActivityCount,
}: Readonly<AdminNavigationProps>) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeItem = getActiveAdminNavigationItem(pathname)
  const fallbackDate = getLocalDateKey(new Date())
  const [agendaDate, setAgendaDate] = useState(
    searchParams.get('date') ?? fallbackDate,
  )

  useEffect(() => {
    setAgendaDate(searchParams.get('date') ?? fallbackDate)
  }, [fallbackDate, searchParams])

  useEffect(() => {
    const updateDate = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === 'string')
        setAgendaDate(event.detail)
    }
    window.addEventListener(ADMIN_AGENDA_DATE_EVENT, updateDate)
    return () => window.removeEventListener(ADMIN_AGENDA_DATE_EVENT, updateDate)
  }, [])

  const createHref = getNewAppointmentHref(agendaDate, fallbackDate)
  const items: Array<{
    key: AdminNavigationItem
    label: string
    href: string
    icon: typeof CalendarDays
  }> = [
    { key: 'agenda', label: 'Agenda', href: '/admin', icon: CalendarDays },
    { key: 'search', label: 'Recherche', href: '/admin/search', icon: Search },
    {
      key: 'activity',
      label: 'Activité',
      href: '/admin/activity',
      icon: Activity,
    },
    { key: 'create', label: 'Ajouter', href: createHref, icon: CirclePlus },
    {
      key: 'settings',
      label: 'Réglages',
      href: '/admin/settings',
      icon: Settings2,
    },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-8">
          <Link
            href="/admin"
            className="mr-auto inline-flex min-h-11 items-center font-heading text-lg font-bold"
          >
            Arbeauté <span className="ml-1 text-brand">Admin</span>
          </Link>

          <nav
            aria-label="Navigation de l’administration"
            className="hidden items-center gap-1 md:flex"
          >
            {items.map(item => {
              const Icon = item.icon
              const isActive = activeItem === item.key
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`${navigationItemBaseClass} relative gap-2 px-3 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                  {item.key === 'activity'
                    ? activityBadge(unreadActivityCount, '-right-1.5 -top-1')
                    : null}
                </Link>
              )
            })}
          </nav>

          {/* Deux gestes fréquents, deux boutons : le menu déroulant n'abritait
              qu'une déconnexion, et revenir au site public demandait de retaper
              l'adresse. */}
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="icon" title="Voir le site">
              <Link href="/">
                <House className="size-5" />
                <span className="sr-only">Voir le site</span>
              </Link>
            </Button>
            <form action={logoutAdmin}>
              <SubmitButton
                variant="outline"
                size="icon"
                title="Se déconnecter"
                aria-label="Se déconnecter"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-5" />
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>

      <nav
        aria-label="Navigation de l’administration"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/97 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {items.map(item => {
            const Icon = item.icon
            const isActive = activeItem === item.key
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`${navigationItemBaseClass} relative min-h-[4.25rem] flex-col gap-1 text-[11px] font-semibold ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`relative grid h-7 min-w-10 place-items-center rounded-full px-2 ${isActive ? 'bg-primary/15' : ''}`}
                >
                  <Icon className="size-5" />
                  {item.key === 'activity'
                    ? activityBadge(unreadActivityCount, '-right-1 -top-1')
                    : null}
                </span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
