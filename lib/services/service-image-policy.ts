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
