'use client'

import { uploadPresigned } from '@vercel/blob/client'
import { ImagePlus, LoaderCircle } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { assignPackageImage, removePackageImage } from '@/lib/actions/packages'
import {
  isValidServiceImageFile,
  SERVICE_IMAGE_CONTENT_TYPES,
} from '@/lib/services/service-image-policy'

export const PackageImageUpload = ({
  packageId,
  imageUrl,
}: Readonly<{ packageId: string; imageUrl: string | null }>) => {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const upload = async (formData: FormData) => {
    const file = formData.get('image')
    if (
      !(file instanceof File) ||
      !isValidServiceImageFile(file.type, file.size)
    ) {
      setError('Choisissez une image JPEG, PNG ou WebP de maximum 5 Mo.')
      return
    }
    setPending(true)
    setError(null)
    try {
      const blob = await uploadPresigned(
        `packages/${packageId}/${file.name}`,
        file,
        {
          access: 'public',
          handleUploadUrl: '/api/service-images/upload',
          clientPayload: JSON.stringify({ packageId, kind: 'package-image' }),
        },
      )
      await assignPackageImage(packageId, blob.url)
      router.refresh()
    } catch {
      setError('L’envoi de l’image a échoué.')
    } finally {
      setPending(false)
    }
  }
  return (
    <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="font-semibold">Affiche</h2>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="Aperçu du forfait"
          width={1408}
          height={768}
          className="mt-4 h-auto w-full rounded-xl"
        />
      ) : (
        <div className="mt-4 flex aspect-video items-center justify-center rounded-xl bg-muted text-muted-foreground">
          Aucune image
        </div>
      )}
      <form action={upload} className="mt-4 flex flex-wrap gap-3">
        <input
          type="file"
          name="image"
          accept={SERVICE_IMAGE_CONTENT_TYPES.join(',')}
          required
          className="max-w-full text-sm"
        />
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          Envoyer
        </Button>
      </form>
      {imageUrl ? (
        <form action={removePackageImage} className="mt-3">
          <input type="hidden" name="id" value={packageId} />
          <Button type="submit" variant="outline">
            Retirer l’affiche
          </Button>
        </form>
      ) : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </section>
  )
}
