'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
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
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteService(id)
      setConfirming(false)
      if (result.ok) router.refresh()
      else setError(result.message)
    })
  }

  if (confirming)
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="rounded-lg border px-3 py-2 text-xs font-medium"
        >
          Non
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          className="rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground"
        >
          Confirmer la suppression
        </button>
      </div>
    )

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null)
          setConfirming(true)
        }}
        aria-label={`Supprimer ${name}`}
        className="rounded-lg border p-2 text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
      {error ? (
        <p className="basis-full text-xs text-destructive">{error}</p>
      ) : null}
    </>
  )
}
