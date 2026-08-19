'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { deleteService } from '@/lib/actions/catalog'

interface ServiceDeleteButtonProps {
  id: string
  name: string
}

export const ServiceDeleteButton = ({
  id,
  name,
}: Readonly<ServiceDeleteButtonProps>) => {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteService(id)
      if (result.ok) router.refresh()
      else setError(result.message)
    })
  }

  return (
    <>
      <ConfirmDialog
        title={`Supprimer « ${name} » ?`}
        description="La prestation sera supprimée uniquement si aucun rendez-vous ne l’utilise. Cette action est irréversible."
        confirmLabel="Supprimer la prestation"
        onConfirm={handleDelete}
        pending={pending}
        trigger={
          <Button
            type="button"
            variant="destructive"
            onClick={() => setError(null)}
            className="mt-4 w-full justify-start"
          >
            <Trash2 className="size-4" /> Supprimer « {name} »
          </Button>
        }
      />
      {error ? (
        <p className="mt-3 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}
