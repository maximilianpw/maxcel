import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const KEY_BYTES = 32
const IV_BYTES = 12

export interface EncryptedSecret {
  version: number
  algorithm: string
  iv: string
  ciphertext: string
  authTag: string
}

export function loadEncryptionKey(
  value = process.env.PLATFORM_ENCRYPTION_KEY,
): Buffer {
  if (!value) {
    throw new Error('PLATFORM_ENCRYPTION_KEY is required')
  }

  const trimmed = value.trim()
  const decoded = /^[a-f0-9]{64}$/i.test(trimmed)
    ? Buffer.from(trimmed, 'hex')
    : Buffer.from(trimmed, 'base64')

  if (decoded.byteLength !== KEY_BYTES) {
    throw new Error('PLATFORM_ENCRYPTION_KEY must decode to 32 bytes')
  }

  return decoded
}

export function encryptSecret(
  plaintext: string,
  key: Buffer,
  aad = 'maxcel-platform',
): EncryptedSecret {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(aad))
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  return {
    version: 1,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptSecret(
  secret: EncryptedSecret,
  key: Buffer,
  aad = 'maxcel-platform',
): string {
  if (secret.version !== 1 || secret.algorithm !== 'aes-256-gcm') {
    throw new Error('Unsupported encrypted secret format')
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(secret.iv, 'base64'),
  )
  decipher.setAAD(Buffer.from(aad))
  decipher.setAuthTag(Buffer.from(secret.authTag, 'base64'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, 'base64')),
    decipher.final(),
  ])

  return plaintext.toString('utf8')
}
