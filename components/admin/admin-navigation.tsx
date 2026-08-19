'use client'

import {
  Activity,
  CalendarDays,
  CirclePlus,
  Clock,
  House,
  LogOut,
  Search,
  Settings2,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { navigationItemBaseClass } from '@/components/ui/navigation'
import { SubmitButton } from '@/components/ui/submit-button'
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
  unreadActivityCount: number
  pendingRequestCount: number
}

const navigationIcons: Record<AdminNavigationItem, typeof CalendarDays> = {
  agenda: CalendarDays,
  requests: Clock,
  search: Search,
  activity: Activity,
  create: CirclePlus,
  settings: Settings2,
}

/**
 * Le dégagement du bas de page suit la hauteur réelle de la barre, publiée par
 * `AdminNavigation` dans `--admin-nav-height`. Une constante suffisait tant que
 * la barre avait cinq entrées ; la sixième, celle des demandes, la faisait
 * grandir sans que le contenu le sache, et le bas de page passait dessous.
 *
 * La valeur de repli couvre le premier rendu, avant toute mesure ; au-delà de
 * `md` la barre disparaît, et la variable remise à zéro annule le dégagement.
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

/**
 * La pastille se pose sur le coin du bouton, pas sur l'icône : accrochée à
 * l'icône, elle en recouvrait le dessin et se lisait comme une rature.
 *
 * Le texte caché dit ce que la pastille compte. Réemployée telle quelle pour
 * les demandes en attente, elle annonçait « N activité(s) non lue(s) » : un
 * lecteur d'écran présentait donc une demande urgente comme une activité
 * consultable plus tard.
 */
const countBadge = (
  count: number,
  className: string,
  describe: (count: number) => string,
) => {
  if (count <= 0) return null
  const label = count > 99 ? '99+' : count.toString()
  return (
    <span
      className={`absolute grid min-h-4 min-w-4 place-items-center rounded-full bg-brand-strong px-1 text-2xs font-bold leading-none text-ink-light ring-2 ring-background ${className}`}
    >
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{describe(count)}</span>
    </span>
  )
}

const describeUnreadActivity = (count: number): string =>
  `${count} activité${count > 1 ? 's' : ''} non lue${count > 1 ? 's' : ''}`

const describePendingRequests = (count: number): string =>
  `${count} demande${count > 1 ? 's' : ''} de dernière minute en attente`

export const AdminNavigation = ({
  unreadActivityCount,
  pendingRequestCount,
}: Readonly<AdminNavigationProps>) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeItem = getActiveAdminNavigationItem(pathname)
  const fallbackDate = getLocalDateKey(new Date())
  const [agendaDate, setAgendaDate] = useState(
    searchParams.get('date') ?? fallbackDate,
  )
  const bottomNavigationRef = useRef<HTMLElement>(null)

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

  // La hauteur de la barre change avec le nombre d'entrées : elle est mesurée
  // puis publiée, pour que le dégagement du contenu la suive au lieu de parier
  // sur une constante.
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
  const items = getAdminNavigationEntries(createHref, pendingRequestCount)

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

          {/* Deux repères de navigation portaient le même nom : dans une
              liste de repères, on ne pouvait pas les distinguer. */}
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
                  className={`${navigationItemBaseClass} relative gap-2 px-3 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                  {item.key === 'activity'
                    ? countBadge(
                        unreadActivityCount,
                        '-right-1.5 -top-1',
                        describeUnreadActivity,
                      )
                    : null}
                  {item.key === 'requests'
                    ? countBadge(
                        pendingRequestCount,
                        '-right-1.5 -top-1',
                        describePendingRequests,
                      )
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
        ref={bottomNavigationRef}
        aria-label="Administration, barre du bas"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/97 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      >
        {/* Autant de colonnes que d'entrées : à six, la grille figée à cinq
            renvoyait la dernière à la ligne. Le libellé rétrécit d'un point
            plutôt que de se couper — la couleur ne dit jamais l'état seule. */}
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
                className={`${navigationItemBaseClass} relative min-h-[4.25rem] flex-col gap-1 font-semibold whitespace-nowrap ${
                  items.length > 5 ? 'text-[10px]' : 'text-[11px]'
                } ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <span
                  className={`relative grid h-7 min-w-10 place-items-center rounded-full px-2 ${isActive ? 'bg-primary/15' : ''}`}
                >
                  <Icon className="size-5" />
                  {item.key === 'activity'
                    ? countBadge(
                        unreadActivityCount,
                        '-right-1 -top-1',
                        describeUnreadActivity,
                      )
                    : null}
                  {item.key === 'requests'
                    ? countBadge(
                        pendingRequestCount,
                        '-right-1 -top-1',
                        describePendingRequests,
                      )
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
