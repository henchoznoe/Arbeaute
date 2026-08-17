import { Bell, ChevronRight } from 'lucide-react'
import Link from 'next/link'

/**
 * Signal des changements venus du site non lus, en tête d'agenda.
 *
 * Volontairement réduit à une ligne : son rôle est d'alerter, pas de résoudre.
 * Le détail et le « tout marquer comme lu » vivent dans l'aperçu sous l'agenda
 * et dans l'onglet Activité. Une alerte plus riche repousserait la journée en
 * cours hors de l'écran, ce que l'agenda doit précisément éviter.
 */
export const ActivityAlert = ({
  unreadCount,
}: Readonly<{ unreadCount: number }>) => {
  if (unreadCount === 0) return null

  return (
    <Link
      href="/admin/activity"
      className="mt-4 flex min-h-14 items-center gap-3 rounded-2xl border border-brand-line bg-brand-subtle px-4 text-brand-strong transition hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <Bell className="size-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-sm font-semibold">
        {unreadCount === 1
          ? '1 nouveauté depuis votre dernier passage'
          : `${unreadCount} nouveautés depuis votre dernier passage`}
      </span>
      <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
    </Link>
  )
}
