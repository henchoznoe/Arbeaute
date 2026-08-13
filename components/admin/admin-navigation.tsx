'use client'

import {
  Activity,
  CalendarDays,
  CirclePlus,
  LogOut,
  Menu,
  Settings2,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { InstallAppButton } from '@/components/pwa/install-app-button'
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

const activityBadge = (count: number) => {
  if (count <= 0) return null
  const label = count > 99 ? '99+' : count.toString()
  return (
    <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
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
            Arbeauté <span className="ml-1 text-rose-500">Admin</span>
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
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="relative">
                    <Icon className="size-4" />
                    {item.key === 'activity'
                      ? activityBadge(unreadActivityCount)
                      : null}
                  </span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <details className="group relative">
            <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-xl border text-muted-foreground transition hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
              <Menu className="size-5" />
              <span className="sr-only">Menu secondaire</span>
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 rounded-2xl border bg-popover p-2 text-popover-foreground shadow-xl">
              <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Application admin
              </p>
              <InstallAppButton
                label="Installer l’application"
                className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium no-underline hover:bg-muted"
              />
              <form action={logoutAdmin}>
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-4" /> Se déconnecter
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>

      <nav
        aria-label="Navigation de l’administration"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/97 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {items.map(item => {
            const Icon = item.icon
            const isActive = activeItem === item.key
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`relative grid h-7 min-w-10 place-items-center rounded-full px-2 ${isActive ? 'bg-primary/15' : ''}`}
                >
                  <Icon className="size-5" />
                  {item.key === 'activity'
                    ? activityBadge(unreadActivityCount)
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
