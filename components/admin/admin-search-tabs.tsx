'use client'

import { CalendarSearch, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { AdminCustomerSearch } from '@/components/admin/admin-customer-search'
import { AdminSearch } from '@/components/admin/admin-search'
import type { AdminCustomerSearchPage } from '@/lib/admin/customer-search'
import type { AdminSearchPage, AdminSearchService } from '@/lib/admin/search'

/**
 * Deux recherches, celle des clients devant.
 *
 * L'onglet actif est un simple état React, jamais un paramètre d'adresse : la
 * page conserve ainsi son enveloppe statique, et rien de ce qu'Arzu tape ne
 * transite par l'URL.
 */
export const AdminSearchTabs = ({
  services,
  initialAppointments,
  initialCustomers,
}: Readonly<{
  services: AdminSearchService[]
  initialAppointments: AdminSearchPage
  initialCustomers: AdminCustomerSearchPage
}>) => {
  const [active, setActive] = useState<'customers' | 'appointments'>(
    'customers',
  )

  const tabClass = (tab: typeof active) =>
    `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
      active === tab
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }`

  return (
    <>
      <nav
        aria-label="Que chercher"
        className="mt-5 grid grid-cols-2 rounded-2xl bg-muted p-1"
      >
        <button
          type="button"
          onClick={() => setActive('customers')}
          aria-current={active === 'customers' ? 'page' : undefined}
          className={tabClass('customers')}
        >
          <UsersRound className="size-4" /> Clients
        </button>
        <button
          type="button"
          onClick={() => setActive('appointments')}
          aria-current={active === 'appointments' ? 'page' : undefined}
          className={tabClass('appointments')}
        >
          <CalendarSearch className="size-4" /> Rendez-vous
        </button>
      </nav>

      {active === 'customers' ? (
        <AdminCustomerSearch initialResult={initialCustomers} />
      ) : (
        <AdminSearch services={services} initialResult={initialAppointments} />
      )}
    </>
  )
}
