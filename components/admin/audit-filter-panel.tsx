'use client'

import { Filter } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formControlClass } from '@/components/ui/form-field'
import { SidePanel } from '@/components/ui/side-panel'

interface AuditFilterField {
  name: 'actor' | 'entity' | 'action'
  label: string
  allLabel: string
  value: string
  options: Array<{ value: string; label: string }>
}

/**
 * Les filtres de l'historique dans un panneau plutôt qu'en tête de page : ils
 * servent une fois sur dix visites, et ils repoussaient la liste — la seule
 * chose qu'on vient lire — sous la ligne de flottaison.
 */
export const AuditFilterPanel = ({
  fields,
  activeCount,
}: Readonly<{ fields: AuditFilterField[]; activeCount: number }>) => {
  const [open, setOpen] = useState(false)

  return (
    <SidePanel
      open={open}
      onOpenChange={setOpen}
      eyebrow="Historique des modifications"
      title="Filtrer l’historique"
      description="Ne garder que certaines modifications. Les filtres restent visibles dans l’adresse de la page."
      trigger={
        <Button variant="outline">
          <Filter className="size-4" /> Filtrer
          {activeCount > 0 ? (
            <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-2xs font-bold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      }
    >
      <form className="space-y-4">
        {fields.map(field => (
          <label
            key={field.name}
            className="grid gap-1.5 text-sm font-medium text-muted-foreground"
          >
            {field.label}
            <select
              name={field.name}
              defaultValue={field.value}
              className={formControlClass}
            >
              <option value="">{field.allLabel}</option>
              {field.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {activeCount > 0 ? (
            <Button asChild variant="outline" className="sm:flex-1">
              <Link href="/admin/activity/audit">Tout afficher</Link>
            </Button>
          ) : null}
          <Button type="submit" className="sm:flex-1">
            Appliquer
          </Button>
        </div>
      </form>
    </SidePanel>
  )
}
