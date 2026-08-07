export const SERVICE_IMAGE_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const SERVICE_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export const isValidServiceImagePath = (
  pathname: string,
  serviceId: string,
): boolean => pathname.startsWith(`services/${serviceId}/`)

export const isValidServiceImageFile = (
  contentType: string,
  size: number,
): boolean =>
  SERVICE_IMAGE_CONTENT_TYPES.includes(
    contentType as (typeof SERVICE_IMAGE_CONTENT_TYPES)[number],
  ) &&
  size > 0 &&
  size <= SERVICE_IMAGE_MAX_BYTES

const SERVICE_CONSENT_CONTENT_TYPES = ['application/pdf'] as const

const SERVICE_CONSENT_MAX_BYTES = 10 * 1024 * 1024

export const isValidServiceConsentFile = (
  contentType: string,
  size: number,
): boolean =>
  contentType === 'application/pdf' &&
  size > 0 &&
  size <= SERVICE_CONSENT_MAX_BYTES

export type ServiceAssetKind = 'image' | 'consent'

/**
 * Contraintes appliquées au jeton d'upload selon le type de fichier, pour
 * qu'un PDF ne puisse jamais être envoyé via le formulaire d'image.
 */
export const getServiceAssetPolicy = (kind: ServiceAssetKind) =>
  kind === 'consent'
    ? {
        contentTypes: [...SERVICE_CONSENT_CONTENT_TYPES],
        maxBytes: SERVICE_CONSENT_MAX_BYTES,
      }
    : {
        contentTypes: [...SERVICE_IMAGE_CONTENT_TYPES],
        maxBytes: SERVICE_IMAGE_MAX_BYTES,
      }
