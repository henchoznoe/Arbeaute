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
import { hasSameOrigin } from '@/lib/utils/request'

const uploadPayloadSchema = z.union([
  z.object({
    serviceId: z.string().min(1),
    kind: z.enum(['image', 'consent']),
  }),
  z.object({ packageId: z.string().min(1), kind: z.literal('package-image') }),
])

// La signature du jeton dépend de la session admin au moment du POST. Cette
// route ne peut donc pas participer à une navigation instantanée prérendue.
export const instant = false

export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as HandleUploadPresignedBody
    const result = await handleUploadPresigned({
      request,
      body,
      webhookPublicKey: env.BLOB_WEBHOOK_PUBLIC_KEY,
      getSignedToken: async (pathname, clientPayload) => {
        if (!(await getAdminSession()) || !(await hasSameOrigin()))
          throw new Error('Unauthorized')
        if (!clientPayload) throw new Error('Missing service')

        const payload = uploadPayloadSchema.parse(JSON.parse(clientPayload))
        if ('packageId' in payload) {
          const item = await prisma.package.findUnique({
            where: { id: payload.packageId },
            select: { id: true },
          })
          if (!item || !pathname.startsWith(`packages/${item.id}/`))
            throw new Error('Invalid upload target')
        } else {
          const service = await prisma.service.findUnique({
            where: { id: payload.serviceId },
            select: { id: true },
          })
          if (!service || !isValidServiceImagePath(pathname, service.id))
            throw new Error('Invalid upload target')
        }

        const { contentTypes, maxBytes } = getServiceAssetPolicy(
          payload.kind === 'package-image' ? 'image' : payload.kind,
        )

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
