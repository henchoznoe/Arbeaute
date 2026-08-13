import { ClipboardList, UsersRound } from 'lucide-react'
import Link from 'next/link'

export const ActivityTabs = ({
  active,
}: Readonly<{ active: 'customer' | 'audit' }>) => (
  <nav
    aria-label="Type d’activité"
    className="mt-5 grid grid-cols-2 rounded-2xl bg-muted p-1"
  >
    <Link
      href="/admin/activity"
      aria-current={active === 'customer' ? 'page' : undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium ${
        active === 'customer'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground'
      }`}
    >
      <UsersRound className="size-4" /> Clientes
    </Link>
    <Link
      href="/admin/activity/audit"
      aria-current={active === 'audit' ? 'page' : undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium ${
        active === 'audit'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground'
      }`}
    >
      <ClipboardList className="size-4" /> Journal admin
    </Link>
  </nav>
)
