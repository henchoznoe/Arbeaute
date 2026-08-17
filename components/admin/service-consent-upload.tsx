'use client'

import { uploadPresigned } from '@vercel/blob/client'
import { FileText, LoaderCircle, Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  assignServiceConsentForm,
  removeServiceConsentForm,
} from '@/lib/actions/catalog'
import { isValidServiceConsentFile } from '@/lib/services/service-image-policy'

interface ServiceConsentUploadProps {
  serviceId: string
  consentFormUrl: string | null
}

export const ServiceConsentUpload = ({
  serviceId,
  consentFormUrl,
}: Readonly<ServiceConsentUploadProps>) => {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadConsentForm = async (formData: FormData) => {
    const file = formData.get('consent')
    if (!(file instanceof File) || file.size === 0) return
    if (!isValidServiceConsentFile(file.type, file.size)) {
      setError('Choisissez un fichier PDF de maximum 10 Mo.')
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
          clientPayload: JSON.stringify({ serviceId, kind: 'consent' }),
        },
      )
      await assignServiceConsentForm(serviceId, blob.url)
      router.refresh()
    } catch {
      setError('L’envoi du formulaire a échoué.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Formulaire de consentement</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Si vous ajoutez un PDF, la cliente sera invitée, au moment de réserver
        cette prestation, à l’imprimer, le remplir et l’apporter au rendez-vous.
      </p>

      {consentFormUrl ? (
        <Button asChild variant="outline" className="mt-4">
          <a href={consentFormUrl} target="_blank" rel="noopener noreferrer">
            <FileText className="size-4 text-destructive" />
            Voir le formulaire actuel (PDF)
          </a>
        </Button>
      ) : (
        <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          Aucun formulaire pour cette prestation.
        </p>
      )}

      <form action={uploadConsentForm} className="mt-4 flex flex-wrap gap-3">
        <input
          type="file"
          name="consent"
          accept="application/pdf"
          required
          className="max-w-full text-sm"
        />
        <Button type="submit" disabled={isUploading}>
          {isUploading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {consentFormUrl ? 'Remplacer' : 'Envoyer'}
        </Button>
      </form>

      {consentFormUrl ? (
        <form action={removeServiceConsentForm} className="mt-3">
          <input type="hidden" name="id" value={serviceId} />
          <Button type="submit" variant="destructive" size="sm">
            <Trash2 className="size-4" />
            Supprimer le formulaire
          </Button>
        </form>
      ) : null}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <p className="mt-3 text-xs text-muted-foreground">
        PDF uniquement, maximum 10 Mo.
      </p>
    </section>
  )
}
