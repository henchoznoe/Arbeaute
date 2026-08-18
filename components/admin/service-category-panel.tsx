'use client'

import { LoaderCircle, Pencil, Plus } from 'lucide-react'
import { type FormEvent, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { formControlClass } from '@/components/ui/form-field'
import { SidePanel } from '@/components/ui/side-panel'
import { createCategory, updateCategory } from '@/lib/actions/catalog'

interface ServiceCategory {
  id: string
  name: string
  description: string | null
  color: string
}

/**
 * Créer ou renommer un groupe se fait dans le panneau latéral.
 *
 * Le formulaire de création vivait dans un `<details>` en tête de page, et
 * celui de modification en pleine largeur au-dessus de chaque groupe : trois
 * champs répétés autant de fois qu'il y a de groupes, entre la liste des soins
 * et son titre. La liste redevient lisible d'un coup d'œil.
 */
export const ServiceCategoryPanel = ({
  category,
}: Readonly<{ category?: ServiceCategory }>) => {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      await (category ? updateCategory(formData) : createCategory(formData))
      setOpen(false)
    })
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={setOpen}
      eyebrow="Groupe de prestations"
      title={category ? category.name : 'Nouveau groupe'}
      description={
        category
          ? 'Le nom et la couleur du groupe tels qu’ils apparaissent sur le site et dans votre agenda.'
          : 'Un groupe rassemble des soins voisins — le site les affiche ensemble, dans l’ordre que vous choisissez.'
      }
      trigger={
        category ? (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Modifier le groupe ${category.name}`}
          >
            <Pencil className="size-4" /> Modifier
          </Button>
        ) : (
          <Button variant="outline">
            <Plus className="size-4" /> Nouveau groupe
          </Button>
        )
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {category ? (
          <input type="hidden" name="id" value={category.id} />
        ) : null}
        <label className="grid gap-1.5 text-sm font-medium">
          Nom
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={category?.name ?? ''}
            placeholder="Soins du visage"
            className={formControlClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Description{' '}
          <span className="font-normal text-muted-foreground">
            (optionnelle)
          </span>
          <input
            name="description"
            defaultValue={category?.description ?? ''}
            placeholder="Ce que ce groupe rassemble, en une phrase"
            className={formControlClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Couleur
          <input
            name="color"
            type="color"
            required
            defaultValue={category?.color ?? '#927b59'}
            className="h-11 w-full rounded-xl border bg-background p-1"
          />
        </label>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {category ? 'Enregistrer le groupe' : 'Créer le groupe'}
        </Button>
      </form>
    </SidePanel>
  )
}
