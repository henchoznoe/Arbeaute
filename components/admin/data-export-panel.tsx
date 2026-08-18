'use client'

import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formControlClass } from '@/components/ui/form-field'
import { SidePanel } from '@/components/ui/side-panel'

/**
 * Les bornes du téléchargement des rendez-vous dans un panneau : trois champs
 * qui ne servent qu'une fois sur deux déséquilibraient une carte à côté de deux
 * autres qui n'en ont aucun. Le bouton sans bornes reste sur la carte, celui
 * qui les demande ouvre le panneau.
 */
export const DataExportPanel = ({
  statusOptions,
}: Readonly<{ statusOptions: Array<{ value: string; label: string }> }>) => (
  <SidePanel
    eyebrow="Télécharger vos données"
    title="Choisir une période"
    description="Sans période, le fichier contient tous les rendez-vous, du plus ancien au plus récent."
    trigger={
      <Button variant="outline" className="w-full">
        <SlidersHorizontal className="size-4" /> Choisir une période
      </Button>
    }
  >
    <form
      action="/admin/data/export/appointments"
      method="get"
      className="space-y-4"
    >
      <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
        Du
        <input name="from" type="date" className={formControlClass} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
        Au
        <input name="to" type="date" className={formControlClass} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
        Statut
        <select name="status" className={formControlClass}>
          <option value="">Tous</option>
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" className="w-full">
        Télécharger cette période
      </Button>
    </form>
  </SidePanel>
)
