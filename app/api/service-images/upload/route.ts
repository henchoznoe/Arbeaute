import { issueSignedToken } from '@vercel/blob'
import {
  type HandleUploadPresignedBody,
  handleUploadPresigned,
} from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { env } from '@/lib/core/env'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import {
  isValidServiceImagePath,
  SERVICE_IMAGE_CONTENT_TYPES,
  SERVICE_IMAGE_MAX_BYTES,
} from '@/lib/services/service-image-policy'

export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as HandleUploadPresignedBody
    const result = await handleUploadPresigned({
      request,
      body,
      webhookPublicKey: env.BLOB_WEBHOOK_PUBLIC_KEY,
      getSignedToken: async (pathname, clientPayload) => {
        if (!(await getAdminSession())) throw new Error('Unauthorized')
        if (!clientPayload) throw new Error('Missing service')
        const service = await prisma.service.findUnique({
          where: { id: clientPayload },
          select: { id: true },
        })
        if (!service || !isValidServiceImagePath(pathname, service.id))
          throw new Error('Invalid upload target')

        const token = await issueSignedToken({
          storeId: env.BLOB_STORE_ID,
          pathname,
          operations: ['put'],
          allowedContentTypes: [...SERVICE_IMAGE_CONTENT_TYPES],
          maximumSizeInBytes: SERVICE_IMAGE_MAX_BYTES,
        })

        return {
          token,
          urlOptions: {
            allowedContentTypes: [...SERVICE_IMAGE_CONTENT_TYPES],
            maximumSizeInBytes: SERVICE_IMAGE_MAX_BYTES,
            addRandomSuffix: true,
          },
        }
      },
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Upload impossible' }, { status: 400 })
  }
}
