'use client'

import {
  Activity,
  BadgeCheck,
  CalendarDays,
  CircleHelp,
  CirclePlus,
  House,
  LogOut,
  Menu,
  Search,
  Settings2,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { navigationItemBaseClass } from '@/components/ui/navigation'
import { SidePanel } from '@/components/ui/side-panel'
import { logoutAdmin } from '@/lib/actions/admin-auth'
import {
  ADMIN_AGENDA_DATE_EVENT,
  type AdminNavigationItem,
  getActiveAdminNavigationItem,
  getAdminNavigationEntries,
  getBottomNavigationColumns,
  getNewAppointmentHref,
} from '@/lib/admin/navigation'
import { getLocalDateKey } from '@/lib/reservation/time'

interface AdminNavigationProps {
  /** Le compteur arrive séparément pour ne pas retenir toute la navigation. */
  attentionBadge?: ReactNode
}

const navigationIcons: Record<AdminNavigationItem, typeof CalendarDays> = {
  agenda: CalendarDays,
  search: Search,
  create: CirclePlus,
  attention: BadgeCheck,
  settings: Settings2,
}

/**
 * Le dégagement du bas de page suit la hauteur réelle de la barre. La liste est
 * désormais fixe, mais la mesure protège la safe area et les futurs changements
 * de libellé sans cacher le bas d'un formulaire.
 */
export const AdminContent = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  const pathname = usePathname()
  if (pathname === '/admin/login') return <div>{children}</div>
  return (
    <div
      className="md:[--admin-nav-height:0px]"
      style={{
        paddingBottom:
          'var(--admin-nav-height, calc(5.25rem + env(safe-area-inset-bottom)))',
      }}
    >
      {children}
    </div>
  )
}

export const AdminNavigation = ({
  attentionBadge,
}: Readonly<AdminNavigationProps>) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeItem = getActiveAdminNavigationItem(pathname)
  const helpIsActive = pathname.startsWith('/admin/aide')
  const fallbackDate = getLocalDateKey(new Date())
  const [agendaDate, setAgendaDate] = useState(
    searchParams.get('date') ?? fallbackDate,
  )
  const bottomNavigationRef = useRef<HTMLElement>(null)
  const logoutFormRef = useRef<HTMLFormElement>(null)

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

  useEffect(() => {
    const bottomNavigation = bottomNavigationRef.current
    if (!bottomNavigation) return
    const publishHeight = () => {
      document.documentElement.style.setProperty(
        '--admin-nav-height',
        `${bottomNavigation.offsetHeight}px`,
      )
    }
    publishHeight()
    const observer = new ResizeObserver(publishHeight)
    observer.observe(bottomNavigation)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--admin-nav-height')
    }
  }, [])

  const createHref = getNewAppointmentHref(agendaDate, fallbackDate)
  const items = getAdminNavigationEntries(createHref)

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center gap-3 px-4 sm:min-h-16 sm:px-8">
          <Link
            href="/admin"
            className="mr-auto inline-flex min-h-11 items-center font-heading text-lg font-bold"
          >
            Arbeauté <span className="ml-1 text-brand">Admin</span>
          </Link>

          <nav
            aria-label="Administration, navigation principale"
            className="hidden items-center gap-1 md:flex"
          >
            {items.map(item => {
              const Icon = navigationIcons[item.key]
              const isActive = activeItem === item.key
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`${navigationItemBaseClass} gap-2 px-3 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Les gestes quotidiens vivent dans la barre stable. Le reste garde
              un nom visible dans un seul menu, au lieu de trois icônes à
              deviner dans chaque écran. */}
          <SidePanel
            title="Menu"
            description="Les accès utiles de temps en temps."
            trigger={
              <Button variant="outline" className="gap-2 px-3">
                <Menu className="size-5" />
                Menu
              </Button>
            }
          >
            <nav
              aria-label="Administration, menu secondaire"
              className="grid gap-2"
            >
              <Button asChild variant="outline" className="justify-start">
                <Link href="/admin/activity">
                  <Activity className="size-5" /> Activité
                </Link>
              </Button>
              <Button
                asChild
                variant={helpIsActive ? 'default' : 'outline'}
                className="justify-start"
              >
                <Link
                  href="/admin/aide"
                  aria-current={helpIsActive ? 'page' : undefined}
                >
                  <CircleHelp className="size-5" /> Aide
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/">
                  <House className="size-5" /> Voir le site
                </Link>
              </Button>
            </nav>

            <form ref={logoutFormRef} action={logoutAdmin} className="hidden" />
            <ConfirmDialog
              trigger={
                <Button
                  variant="outline"
                  className="mt-5 w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="size-5" /> Se déconnecter
                </Button>
              }
              title="Se déconnecter ?"
              description="Vous devrez saisir à nouveau le mot de passe pour ouvrir l’administration."
              confirmLabel="Oui, se déconnecter"
              cancelLabel="Rester ici"
              onConfirm={() => logoutFormRef.current?.requestSubmit()}
            />
          </SidePanel>
        </div>
      </header>

      <nav
        ref={bottomNavigationRef}
        aria-label="Administration, barre du bas"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/97 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      >
        {/* Cinq repères fixes : une demande ne déplace plus les habitudes
            d'Arzu et aucun libellé ne descend sous 11 px. */}
        <div
          className="mx-auto grid max-w-lg"
          style={{
            gridTemplateColumns: getBottomNavigationColumns(items.length),
          }}
        >
          {items.map(item => {
            const Icon = navigationIcons[item.key]
            const isActive = activeItem === item.key
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`${navigationItemBaseClass} relative min-h-[4.25rem] flex-col gap-1 text-2xs font-semibold whitespace-nowrap ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <span
                  className={`relative grid h-7 min-w-10 place-items-center rounded-full px-2 ${isActive ? 'bg-primary/15' : ''}`}
                >
                  <Icon className="size-5" />
                  {item.key === 'attention' ? attentionBadge : null}
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
