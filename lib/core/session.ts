const encoder = new TextEncoder()

export type SessionKind = 'admin' | 'customer'

export interface SessionPayload {
  kind: SessionKind
  subject: string
  version: number
  issuedAt: number
  expiresAt: number
}

interface CreateSessionOptions {
  kind: SessionKind
  subject: string
  version?: number
  ttlSeconds: number
  secret: string
  now?: number
}

const encodeBase64Url = (value: string): string =>
  btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')

const decodeBase64Url = (value: string): string => {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
}

const encodeBytes = (bytes: ArrayBuffer): string => {
  const binary = Array.from(new Uint8Array(bytes), byte =>
    String.fromCharCode(byte),
  ).join('')
  return encodeBase64Url(binary)
}

const decodeBytes = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = decodeBase64Url(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index)
  return bytes
}

const getSigningKey = (secret: string) =>
  crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )

export const createSessionToken = async ({
  kind,
  subject,
  version = 1,
  ttlSeconds,
  secret,
  now = Date.now(),
}: CreateSessionOptions): Promise<string> => {
  const issuedAt = Math.floor(now / 1000)
  const payload: SessionPayload = {
    kind,
    subject,
    version,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
  }
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const key = await getSigningKey(secret)
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(encodedPayload),
  )

  return `${encodedPayload}.${encodeBytes(signature)}`
}

export const verifySessionToken = async (
  token: string | undefined,
  secret: string,
  expectedKind: SessionKind,
  now = Date.now(),
): Promise<SessionPayload | null> => {
  if (!token || secret.length < 32) return null

  const [encodedPayload, encodedSignature, ...remainder] = token.split('.')
  if (!encodedPayload || !encodedSignature || remainder.length > 0) return null

  try {
    const key = await getSigningKey(secret)
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBytes(encodedSignature),
      encoder.encode(encodedPayload),
    )
    if (!isValid) return null

    const payload = JSON.parse(
      decodeBase64Url(encodedPayload),
    ) as SessionPayload
    const nowInSeconds = Math.floor(now / 1000)

    if (
      payload.kind !== expectedKind ||
      !payload.subject ||
      !Number.isInteger(payload.version) ||
      !Number.isInteger(payload.issuedAt) ||
      !Number.isInteger(payload.expiresAt) ||
      payload.issuedAt > nowInSeconds + 60 ||
      payload.expiresAt <= nowInSeconds
    )
      return null

    return payload
  } catch {
    return null
  }
}
