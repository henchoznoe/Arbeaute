import { issueSignedToken } from '@vercel/blob'
import {
  type HandleUploadPresignedBody,
  handleUploadPresigned,
} from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { env } from '@/lib/core/env'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import {
  getServiceAssetPolicy,
  isValidServiceImagePath,
} from '@/lib/services/service-image-policy'

const uploadPayloadSchema = z.object({
  serviceId: z.string().min(1),
  kind: z.enum(['image', 'consent']),
})

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

        const payload = uploadPayloadSchema.parse(JSON.parse(clientPayload))
        const service = await prisma.service.findUnique({
          where: { id: payload.serviceId },
          select: { id: true },
        })
        if (!service || !isValidServiceImagePath(pathname, service.id))
          throw new Error('Invalid upload target')

        const { contentTypes, maxBytes } = getServiceAssetPolicy(payload.kind)

        const token = await issueSignedToken({
          storeId: env.BLOB_STORE_ID,
          pathname,
          operations: ['put'],
          allowedContentTypes: contentTypes,
          maximumSizeInBytes: maxBytes,
        })

        return {
          token,
          urlOptions: {
            allowedContentTypes: contentTypes,
            maximumSizeInBytes: maxBytes,
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
