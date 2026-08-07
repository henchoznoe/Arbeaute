import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  findUnique: vi.fn(),
  issueSignedToken: vi.fn(),
}))

vi.mock('@/lib/core/session-cookies', () => ({
  getAdminSession: mocks.getAdminSession,
}))

vi.mock('@/lib/core/prisma', () => ({
  default: { service: { findUnique: mocks.findUnique } },
}))

vi.mock('@vercel/blob', () => ({
  issueSignedToken: mocks.issueSignedToken,
}))

vi.mock('@vercel/blob/client', () => ({
  handleUploadPresigned: vi.fn(
    async ({ body, getSignedToken }: Record<string, unknown>) => {
      const payload = body as { pathname: string; clientPayload: string }
      return getSignedToken instanceof Function
        ? getSignedToken(payload.pathname, payload.clientPayload)
        : null
    },
  ),
}))

import { POST } from '@/app/api/service-images/upload/route'

const makeRequest = (pathname = 'services/service-1/photo.jpg') =>
  new Request('http://localhost/api/service-images/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pathname, clientPayload: 'service-1' }),
  })

describe('service image upload authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findUnique.mockResolvedValue({ id: 'service-1' })
    mocks.issueSignedToken.mockResolvedValue('signed-token')
  })

  it('refuses to issue an upload token without an admin session', async () => {
    mocks.getAdminSession.mockResolvedValue(null)

    const response = await POST(makeRequest())

    expect(response.status).toBe(400)
    expect(mocks.issueSignedToken).not.toHaveBeenCalled()
  })

  it('issues a scoped token with the expected file restrictions', async () => {
    mocks.getAdminSession.mockResolvedValue({ kind: 'admin' })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(mocks.issueSignedToken).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: 'services/service-1/photo.jpg',
        maximumSizeInBytes: 5 * 1024 * 1024,
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
      }),
    )
  })

  it('refuses a path belonging to another service', async () => {
    mocks.getAdminSession.mockResolvedValue({ kind: 'admin' })

    const response = await POST(makeRequest('services/service-2/photo.jpg'))

    expect(response.status).toBe(400)
    expect(mocks.issueSignedToken).not.toHaveBeenCalled()
  })

  it('returns a controlled error for malformed JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/service-images/upload', {
        method: 'POST',
        body: '{',
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Upload impossible',
    })
  })
})
