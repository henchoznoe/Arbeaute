'use client'

import { uploadPresigned } from '@vercel/blob/client'
import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { assignServiceImage, removeServiceImage } from '@/lib/actions/catalog'
import {
  isValidServiceImageFile,
  SERVICE_IMAGE_CONTENT_TYPES,
} from '@/lib/services/service-image-policy'

interface ServiceImageUploadProps {
  serviceId: string
  imageUrl: string | null
}

export const ServiceImageUpload = ({
  serviceId,
  imageUrl,
}: Readonly<ServiceImageUploadProps>) => {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadImage = async (formData: FormData) => {
    const file = formData.get('image')
    if (!(file instanceof File) || file.size === 0) return
    if (!isValidServiceImageFile(file.type, file.size)) {
      setError('Choisissez une image JPEG, PNG ou WebP de maximum 5 Mo.')
      return
    }

    setError(null)
    setIsUploading(true)
    try {
      const blob = await uploadPresigned(
        `services/${serviceId}/${file.name}`,
        file,
        {
          access: 'public',
          handleUploadUrl: '/api/service-images/upload',
          clientPayload: JSON.stringify({ serviceId, kind: 'image' }),
        },
      )
      await assignServiceImage(serviceId, blob.url)
      router.refresh()
    } catch {
      setError('L’envoi de l’image a échoué.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Image</h2>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="Aperçu de la prestation"
          width={800}
          height={450}
          className="mt-4 aspect-video w-full max-w-xl rounded-xl object-cover"
        />
      ) : (
        <div className="mt-4 flex aspect-video w-full max-w-xl items-center justify-center rounded-xl bg-muted text-muted-foreground">
          Aucune image
        </div>
      )}

      <form action={uploadImage} className="mt-4 flex flex-wrap gap-3">
        <input
          type="file"
          name="image"
          accept={SERVICE_IMAGE_CONTENT_TYPES.join(',')}
          required
          className="max-w-full text-sm"
        />
        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isUploading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          Envoyer
        </button>
      </form>

      {imageUrl ? (
        <form action={removeServiceImage} className="mt-3">
          <input type="hidden" name="id" value={serviceId} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 text-sm text-destructive"
          >
            <Trash2 className="size-4" />
            Supprimer l’image
          </button>
        </form>
      ) : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <p className="mt-3 text-xs text-muted-foreground">
        JPEG, PNG ou WebP, maximum 5 Mo.
      </p>
    </section>
  )
}
