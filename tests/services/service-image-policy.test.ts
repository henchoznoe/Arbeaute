import { describe, expect, it } from 'vitest'
import {
  isValidServiceImageFile,
  isValidServiceImagePath,
  SERVICE_IMAGE_MAX_BYTES,
} from '@/lib/services/service-image-policy'

describe('service image upload policy', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'accepts %s up to 5 MB',
    contentType => {
      expect(
        isValidServiceImageFile(contentType, SERVICE_IMAGE_MAX_BYTES),
      ).toBe(true)
    },
  )

  it('rejects unsupported, empty and oversized files', () => {
    expect(isValidServiceImageFile('image/gif', 100)).toBe(false)
    expect(isValidServiceImageFile('image/png', 0)).toBe(false)
    expect(
      isValidServiceImageFile('image/webp', SERVICE_IMAGE_MAX_BYTES + 1),
    ).toBe(false)
  })

  it('only accepts a path scoped to the selected service', () => {
    expect(
      isValidServiceImagePath('services/service-1/photo.jpg', 'service-1'),
    ).toBe(true)
    expect(
      isValidServiceImagePath('services/service-2/photo.jpg', 'service-1'),
    ).toBe(false)
    expect(
      isValidServiceImagePath('services/service-1-evil/photo.jpg', 'service-1'),
    ).toBe(false)
  })
})
