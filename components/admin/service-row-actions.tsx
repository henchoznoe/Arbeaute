'use client'

import { Archive, ArchiveRestore, Copy, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidePanel } from '@/components/ui/side-panel'
import { SubmitButton } from '@/components/ui/submit-button'
import { duplicateService, toggleServiceArchive } from '@/lib/actions/catalog'
import { ServiceDeleteButton } from './service-delete-button'

/**
 * Les gestes rares d'une prestation, derrière une seule ouverture.
 *
 * La ligne portait six contrôles, dont cinq boutons-icônes de forme identique,
 * repliés sur trois rangs de 177 px. « Archiver » et « Supprimer » y étaient
 * voisins immédiats alors que l'un est réversible et l'autre non : les
 * `aria-label` étaient corrects, mais rien ne les distinguait à l'œil.
 *
 * En façade il ne reste que ce qui sert tous les jours — ouvrir la prestation,
 * et l'ordre. Le reste passe ici, nommé en toutes lettres, et la suppression
 * est séparée du reste par un intervalle et une phrase.
 */
export const ServiceRowActions = ({
  id,
  name,
  isArchived,
}: Readonly<{ id: string; name: string; isArchived: boolean }>) => (
  <SidePanel
    eyebrow="Prestation"
    title={name}
    description="Les gestes qui ne servent pas tous les jours."
    trigger={
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Autres actions pour ${name}`}
      >
        <MoreHorizontal className="size-4" />
      </Button>
    }
  >
    <div className="space-y-3">
      <form action={duplicateService}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton variant="outline" className="w-full justify-start">
          <Copy className="size-4" /> Dupliquer cette prestation
        </SubmitButton>
      </form>
      <form action={toggleServiceArchive}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton variant="outline" className="w-full justify-start">
          {isArchived ? (
            <ArchiveRestore className="size-4" />
          ) : (
            <Archive className="size-4" />
          )}
          {isArchived ? 'Remettre en service' : 'Mettre de côté'}
        </SubmitButton>
      </form>
    </div>

    <div className="mt-8 border-t pt-5">
      <p className="text-sm font-medium">Supprimer définitivement</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Mettre de côté suffit dans presque tous les cas : la prestation
        disparaît du site et ses rendez-vous passés restent lisibles. La
        suppression, elle, ne se reprend pas.
      </p>
      <ServiceDeleteButton id={id} name={name} />
    </div>
  </SidePanel>
)
